import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { PageHeading } from '../components/UI'
import SplitTable from '../components/SplitTable'
import { formatTime, parseTime, raceGap, raceGapLabel, shortenRun, splitPlan, totalTime, type PacePlan, type RaceReference, type RunRecord, type Strategy } from '../running'
import { announceRaceSplit, canSpeak, speakRaceCue, stopSpeech } from '../raceAudio'
import { recordGpsSplits } from '../gps'
import { useRunLocation, type GpsSegment } from '../useRunLocation'
import { loadRuns, saveRun } from '../workoutStorage'

type Session = { id: string; plan: PacePlan; elapsed: number; startedAt: number | null; laps: number[]; gpsMeters?: number; race?: RaceReference; audio?: boolean }
const sessionKey = 'traincraft:active-run'

function restoreSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) ?? 'null')
  } catch {
    return null
  }
}

function elapsedAt(session: Session, now: number) {
  return session.elapsed + (session.startedAt === null ? 0 : Math.max(0, now - session.startedAt) / 1000)
}

export default function Run() {
  const [session, setSession] = useState(restoreSession)
  const currentSession = useRef(session)
  const [plan, setPlan] = useState<PacePlan | null>(() => session?.plan ?? null)
  const [race, setRace] = useState<RaceReference | undefined>(session?.race)
  const [raceChoice, setRaceChoice] = useState('')
  const [audio, setAudio] = useState(session?.audio ?? false)
  const [clock, setClock] = useState(Date.now)
  const [runs, setRuns] = useState<RunRecord[]>()
  const [manualDistance, setManualDistance] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [planError, setPlanError] = useState('')
  const [runError, setRunError] = useState('')
  const [historyError, setHistoryError] = useState(false)

  useEffect(() => {
    let current = true
    loadRuns().then(items => { if (current) setRuns(items) }, () => { if (current) setHistoryError(true) })
    return () => { current = false }
  }, [])

  useEffect(() => stopSpeech, [])

  const running = session?.startedAt != null
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setClock(Date.now()), 200)
    return () => window.clearInterval(timer)
  }, [running])

  const updateSession = useCallback((next: Session | null) => {
    currentSession.current = next
    setSession(next)
    try {
      if (next) localStorage.setItem(sessionKey, JSON.stringify(next))
      else localStorage.removeItem(sessionKey)
    } catch {
      setRunError('The current run is available while this screen stays open. The browser could not store the session.')
    }
  }, [])

  const trackSegment = useCallback(({ meters, from, to }: GpsSegment) => {
    const active = currentSession.current
    if (active?.gpsMeters === undefined || active.startedAt === null) return
    const metersPerUnit = active.plan.unit === 'mi' ? 1609.344 : 1000
    const result = recordGpsSplits({
      previousMeters: active.gpsMeters,
      segmentMeters: meters,
      fromSeconds: elapsedAt(active, from),
      toSeconds: elapsedAt(active, to),
      laps: active.laps,
      targets: splitPlan(active.plan).map(split => split.end * metersPerUnit),
    })
    setClock(Date.now())
    updateSession({
      ...active,
      gpsMeters: result.meters,
      laps: result.laps,
      ...(result.finishedAt === null ? {} : { elapsed: result.finishedAt, startedAt: null }),
    })
    announceRaceSplit(active.race, active.audio, result.laps, active.laps.length)
  }, [updateSession])
  const gpsStatus = useRunLocation(running && session?.gpsMeters !== undefined, trackSegment)

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const distance = Number(data.get('distance'))
    const seconds = parseTime(String(data.get('time')))
    if (!seconds) {
      setPlanError('Enter a goal time like 28:20.')
      return
    }
    const nextPlan: PacePlan = {
      distance,
      seconds,
      unit: data.get('unit') === 'mi' ? 'mi' : 'km',
      strategy: data.get('strategy') as Strategy,
    }
    if (splitPlan(nextPlan).some(split => split.seconds < 1)) {
      setPlanError('Choose a goal time that gives every split at least one second.')
      return
    }
    setPlanError('')
    setNotice('')
    setRace(undefined)
    setPlan(nextPlan)
  }

  function selectRace(run: RunRecord) {
    setRace({ completedAt: run.completedAt, laps: run.laps })
    setPlan({ distance: run.distance, unit: run.unit, seconds: totalTime(run), strategy: 'even' })
    setRunError('')
    setNotice('')
  }

  function toggleAudio(enabled: boolean) {
    setAudio(enabled)
    if (session) updateSession({ ...session, audio: enabled })
    if (enabled) speakRaceCue('Race audio is on.')
    else stopSpeech()
  }

  function start(gps: boolean) {
    if (!plan) return
    setNotice('')
    setRunError('')
    setManualDistance('')
    const now = Date.now()
    setClock(now)
    if (race && audio) speakRaceCue('Race started.')
    updateSession({ id: crypto.randomUUID?.() ?? String(now) + Math.random(), plan, elapsed: 0, startedAt: now, laps: [], gpsMeters: gps ? 0 : undefined, race, audio: !!race && audio })
  }

  function togglePause() {
    if (!session) return
    const now = Date.now()
    setClock(now)
    updateSession({ ...session, elapsed: elapsedAt(session, now), startedAt: running ? null : now })
  }

  function markLap() {
    if (!session || !running) return
    const now = Date.now()
    const elapsed = elapsedAt(session, now)
    const last = session.laps.reduce((sum, lap) => sum + lap, 0)
    if (elapsed - last < 1) {
      setRunError('Wait at least one second before recording this split.')
      return
    }
    setRunError('')
    const laps = [...session.laps, elapsed - last]
    const finished = laps.length === splitPlan(session.plan).length
    setClock(now)
    updateSession({ ...session, laps, elapsed, startedAt: finished ? null : now })
    announceRaceSplit(session.race, session.audio, laps, session.laps.length)
  }

  async function finish() {
    const active = currentSession.current
    if (!active) return
    const now = Date.now()
    const remaining = splitPlan(active.plan)[active.laps.length]
    const result = remaining
      ? shortenRun(active.plan, active.laps, saveDistance, elapsedAt(active, now))
      : { ...active.plan, laps: active.laps, race: active.race }
    if (!result) {
      setRunError('Could not save yet. Record a split or enter the distance you covered.')
      return
    }

    // Freeze the exact finish time while storage settles. A failed save can be retried.
    setClock(now)
    if (active.startedAt !== null) updateSession({ ...active, elapsed: elapsedAt(active, now), startedAt: null })
    const record: RunRecord = { ...result, id: active.id, completedAt: new Date(now).toISOString() }
    setSaving(true)
    setRunError('')
    try {
      await saveRun(record)
      setRuns(previous => [record, ...(previous ?? []).filter(item => item.id !== record.id)])
      updateSession(null)
      setRace(undefined)
      if (active.race) setPlan(null)
      setNotice(record.race ? 'Race saved. ' + raceGapLabel(raceGap(record.laps, record.race)) + '.' : 'Run saved to your history.')
    } catch {
      setRunError('Could not save the run. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const raceRuns = runs?.filter(run => run.laps.length === Math.ceil(run.distance)) ?? []
  const reference = session?.race ?? race
  const lastGap = reference && session?.laps.length ? raceGap(session.laps, reference) : undefined
  const splits = plan ? splitPlan(plan) : []
  const next = splits[session?.laps.length ?? 0]
  const gps = session?.gpsMeters !== undefined
  const liveDistance = (session?.gpsMeters ?? 0) / (plan?.unit === 'mi' ? 1609.344 : 1000)
  const lastDistance = splits[(session?.laps.length ?? 0) - 1]?.end ?? 0
  const saveDistance = gps ? Math.max(lastDistance, Math.floor(liveDistance * 1000) / 1000) : Number(manualDistance || lastDistance)
  const canSaveEarly = !!session && !!next && !!shortenRun(session.plan, session.laps, saveDistance, elapsedAt(session, clock))
  return <>
    <PageHeading eyebrow="RUNNING" title="Run" description="Set a goal, record your splits, and see how your run compares." />
    {!session && <section className="panel workout-form race-selector">
      <h2>Race Your Last Run</h2>
      {raceRuns.length ? <>
        <label>Past run<select value={raceRuns.some(run => run.id === raceChoice) ? raceChoice : raceRuns[0].id} onChange={event => setRaceChoice(event.target.value)}>
          {raceRuns.map(run => <option key={run.id} value={run.id}>{new Date(run.completedAt).toLocaleDateString()} · {run.distance} {run.unit} · {formatTime(totalTime(run))}</option>)}
        </select></label>
        <button className="button secondary" type="button" onClick={() => selectRace(raceRuns.find(run => run.id === raceChoice) ?? raceRuns[0])}>Race this run</button>
      </> : <p className="workout-note">Finish and save a run to race against it here.</p>}
    </section>}
    {!session && !race && <form className="panel workout-form" onSubmit={calculate}>
      <h2>Plan a run</h2>
      <div className="target-fields">
        <label>Distance<input name="distance" type="number" inputMode="decimal" min="0.01" max="200" step="0.01" defaultValue={plan?.distance ?? 5} required /></label>
        <label>Unit<select name="unit" defaultValue={plan?.unit}><option value="km">Kilometers</option><option value="mi">Miles</option></select></label>
        <label>Goal time (min:sec)<input name="time" defaultValue={plan && formatTime(plan.seconds) || '28:20'} placeholder="28:20" required /></label>
        <label>Pacing strategy<select name="strategy" defaultValue={plan?.strategy}><option value="even">Even pace</option><option value="negative">Faster finish</option><option value="positive">Faster start</option></select></label>
      </div>
      {planError && <p role="alert">{planError}</p>}
      <button className="button secondary" type="submit">Calculate plan</button>
    </form>}
    {plan && <section className="section">
      <div className="section-heading">
        <h2>{plan.distance} {plan.unit} {reference ? 'race' : 'pace plan'}</h2>
        <span>{reference ? formatTime(plan.seconds) + ' to beat' : formatTime(plan.seconds / plan.distance) + ' /' + plan.unit + ' avg'}</span>
      </div>
      {reference && <div className="panel workout-form race-settings">
        <p>Against your run from {new Date(reference.completedAt).toLocaleDateString()}.</p>
        {canSpeak() ? <label className="audio-option"><input type="checkbox" checked={session ? !!session.audio : audio} onChange={event => toggleAudio(event.target.checked)} /> Spoken split cues</label>
          : <p className="workout-note">Spoken cues are unavailable in this browser.</p>}
        {!session && <button className="button secondary" type="button" onClick={() => { setRace(undefined); setPlan(null); stopSpeech() }}>Back to pace planning</button>}
      </div>}
      {session ? <div className="panel workout-form run-timer">
        <strong className="metric-value" aria-label="Elapsed time">{formatTime(Math.floor(elapsedAt(session, clock)))}</strong>
        {lastGap !== undefined && <p className="race-gap" role="status">{raceGapLabel(lastGap)}</p>}
        {gps && <div className="gps-distance">
          <strong>{liveDistance.toFixed(2)} {plan.unit}</strong>
          {next && <><p role="status">{gpsStatus || 'GPS paused'}</p><p>Next split at {next.end} {plan.unit}. Keep TrainCraft visible and your screen unlocked.</p></>}
          {!next && <p>Goal distance reached.</p>}
        </div>}
        {next && !gps && <p>Tap at {next.end} {plan.unit} to record your split.</p>}
        {next && !gps && <label>Distance covered ({plan.unit}, optional)
          <input type="number" inputMode="decimal" min={Math.max(0.001, lastDistance)} step="0.001" value={manualDistance}
            placeholder={lastDistance ? String(lastDistance) : undefined} disabled={saving} onChange={event => setManualDistance(event.target.value)} />
        </label>}
        {next && <p className="workout-note">
          {gps ? 'Save early once GPS has measured distance.' : `To save early, use your last recorded split or enter your total distance below ${next.end} ${plan.unit}.`}
          {reference && ' An early finish is saved as a run.'}
        </p>}
        <div className="run-actions">
          {next ? <>
            <button className="button secondary" type="button" disabled={saving} onClick={togglePause}>{running ? 'Pause' : 'Resume'}</button>
            {gps ? <button className="button secondary" type="button" disabled={saving} onClick={() => {
              setRunError('')
              updateSession({ ...session, gpsMeters: undefined })
            }}>Switch to manual laps</button> : <button className="button primary" type="button" disabled={!running || saving} onClick={markLap}>{session.laps.length === splits.length - 1 ? 'Finish distance' : 'Lap'}</button>}
          </> : null}
          <button className={'button ' + (next ? 'secondary' : 'primary')} type="button" disabled={saving || (!!next && !canSaveEarly)} onClick={finish}>
            {saving ? 'Saving…' : next ? 'Stop and save run' : 'Save run'}
          </button>
          <button className="button secondary" disabled={saving} type="button" onClick={() => {
            if (window.confirm('Discard this unsaved run?')) {
              setRunError('')
              stopSpeech()
              updateSession(null)
            }
          }}>Discard</button>
        </div>
      </div> : <div className="run-actions run-start">
        <button className="button primary" type="button" onClick={() => start(true)}>Start GPS run</button>
        <button className="button secondary" type="button" onClick={() => start(false)}>Start manual run</button>
      </div>}
      {runError && <p role="alert" className="workout-note">{runError}</p>}
      <SplitTable plan={plan} laps={session?.laps ?? []} race={reference} />
    </section>}
    {notice && <p role="status" className="workout-note">{notice}</p>}
    <section className="section">
      <div className="section-heading"><h2>Run history</h2></div>
      {historyError && <p role="alert">Could not load saved runs.</p>}
      {!runs && !historyError && <p role="status">Loading runs…</p>}
      {runs?.length === 0 && <p className="workout-note">Your saved runs will appear here.</p>}
      {runs?.map(run => <details className="panel routine saved-run" key={run.id}>
        <summary><span className="activity-copy"><strong>{run.distance} {run.unit} · {formatTime(totalTime(run))}</strong><span>{new Date(run.completedAt).toLocaleDateString()} · {formatTime(totalTime(run) / run.distance)} /{run.unit}{run.stoppedEarly && ' · Ended early'}</span></span></summary>
        {run.race && <p className="race-result"><strong>{raceGapLabel(raceGap(run.laps, run.race))}</strong> against your run from {new Date(run.race.completedAt).toLocaleDateString()}.</p>}
        <SplitTable plan={run} laps={run.laps} race={run.race} plannedLaps={run.plannedLaps} />
      </details>)}
    </section>
  </>
}
