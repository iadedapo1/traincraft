import { useEffect, useState } from 'react'
import { CalendarCheck, Footprints, Trophy } from 'lucide-react'
import { Metric, PageHeading } from '../components/UI'
import TrendChart from '../components/TrendChart'
import { formatTime, kilometers, totalTime, type DistanceUnit, type RunRecord } from '../running'
import { loadRuns, loadWorkouts, type Workout } from '../workoutStorage'

const poundsPerKilogram = 2.20462262
const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString()
const shortDate = (date: string) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function strengthHistory(workouts: Workout[]) {
  const exercises = new Map<string, { date: string; value: number; reps: number }[]>()
  for (const workout of [...workouts].reverse()) {
    const heaviest = new Map<string, { date: string; value: number; reps: number }>()
    for (const set of workout.sets) {
      const value = workout.unit === 'kg' ? set.weight * poundsPerKilogram : set.weight
      const previous = heaviest.get(set.exercise)
      if (!previous || value > previous.value || (value === previous.value && set.reps > previous.reps)) {
        heaviest.set(set.exercise, { date: workout.completedAt, value, reps: set.reps })
      }
    }
    for (const [name, entry] of heaviest) {
      const entries = exercises.get(name) ?? []
      entries.push(entry)
      exercises.set(name, entries)
    }
  }
  return exercises
}

export default function Progress() {
  const [data, setData] = useState<{ workouts: Workout[]; runs: RunRecord[] }>()
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState('')
  const [weightUnit, setWeightUnit] = useState<Workout['unit']>('lb')
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km')

  useEffect(() => {
    let active = true
    Promise.all([loadWorkouts(), loadRuns()]).then(([workouts, runs]) => {
      if (!active) return
      setData({ workouts, runs })
      setWeightUnit(workouts[0]?.unit ?? 'lb')
      setDistanceUnit(runs[0]?.unit ?? 'km')
    }, () => { if (active) setError(true) })
    return () => { active = false }
  }, [])

  const heading = <PageHeading eyebrow="PERFORMANCE" title="Progress" description="See your training history, personal records, and recent trends." />
  if (!data) return <>{heading}{error ? <p role="alert">Could not load training history.</p> : <p role="status">Loading training history…</p>}</>

  const { workouts, runs } = data
  const exercises = strengthHistory(workouts)
  const exercise = selected || exercises.keys().next().value || ''
  const points = exercises.get(exercise) ?? []
  const records = [...exercises].map(([name, sets]) => ({
    name,
    set: sets.reduce((best, set) => set.value > best.value || (set.value === best.value && set.reps > best.reps) ? set : best),
  }))
  const recent = new Date()
  recent.setHours(0, 0, 0, 0)
  recent.setDate(recent.getDate() - 6)
  const isRecent = (item: { completedAt: string }) => new Date(item.completedAt) >= recent
  const distance = (run: RunRecord) => kilometers(run) / (distanceUnit === 'mi' ? 1.609344 : 1)
  const weeklyDistance = runs.filter(isRecent).reduce((sum, run) => sum + distance(run), 0)
  const pace = (run: RunRecord) => totalTime(run) / distance(run)
  const weight = (value: number) => formatNumber(weightUnit === 'kg' ? value / poundsPerKilogram : value) + ' ' + weightUnit
  const bestTimes = new Map<string, RunRecord>()
  for (const run of runs) {
    const label = run.distance + ' ' + run.unit
    const best = bestTimes.get(label)
    if (!best || totalTime(run) < totalTime(best)) bestTimes.set(label, run)
  }
  const history = [
    ...workouts.map(item => ({ id: 'workout-' + item.id, date: item.completedAt, name: item.name, detail: item.sets.length + (item.sets.length === 1 ? ' set' : ' sets') })),
    ...runs.map(item => ({ id: 'run-' + item.id, date: item.completedAt, name: item.distance + ' ' + item.unit + ' run', detail: formatTime(totalTime(item)) })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return <>{heading}
    <div className="metrics">
      <Metric icon={<CalendarCheck size={19} />} label="Sessions · last 7 days" value={String(workouts.filter(isRecent).length + runs.filter(isRecent).length)} />
      <Metric icon={<Trophy size={19} />} label="Exercises with records" value={String(exercises.size)} />
      <Metric icon={<Footprints size={19} />} label="Distance · last 7 days" value={formatNumber(weeklyDistance)} unit={distanceUnit} />
    </div>
    <section className="section">
      <div className="section-heading"><h2>Strength trends</h2></div>
      {points.length === 0 ? <p className="workout-note">Save a strength workout to see your first exercise trend and records.</p> : <div className="two-columns">
        <div className="panel chart-panel">
          <div className="workout-form progress-controls">
            <label>Exercise<select value={exercise} onChange={event => setSelected(event.target.value)}>{[...exercises.keys()].map(name => <option key={name}>{name}</option>)}</select></label>
            <label>Weight unit<select value={weightUnit} onChange={event => setWeightUnit(event.target.value === 'kg' ? 'kg' : 'lb')}><option value="lb">lb</option><option value="kg">kg</option></select></label>
          </div>
          <p>Heaviest set per workout · latest {weight(points[points.length - 1].value)}</p>
          <TrendChart points={points.map(point => ({ ...point, date: shortDate(point.date) }))} format={weight} />
        </div>
        <div className="panel records">
          <h2>Strength personal records</h2>
          <ul className="activity-list">{records.map(({ name, set }) => <li className="activity-row" key={name}>
            <div className="activity-copy"><strong>{name}</strong><span>{shortDate(set.date)} · {set.reps} reps</span></div><strong>{weight(set.value)}</strong>
          </li>)}</ul>
        </div>
      </div>}
    </section>
    <section className="section">
      <div className="section-heading"><h2>Running trends</h2></div>
      {runs.length === 0 ? <p className="workout-note">Save a run to see your distance, pace, and best times.</p> : <div className="two-columns">
        <div className="panel chart-panel">
          <div className="workout-form progress-controls"><label>Distance unit<select value={distanceUnit} onChange={event => setDistanceUnit(event.target.value === 'mi' ? 'mi' : 'km')}><option value="km">Kilometers</option><option value="mi">Miles</option></select></label></div>
          <p>Average pace per run · latest {formatTime(pace(runs[0]))} /{distanceUnit}</p>
          <TrendChart points={[...runs].reverse().map(run => ({ value: pace(run), date: shortDate(run.completedAt) }))} format={value => formatTime(value) + ' /' + distanceUnit} />
        </div>
        <div className="panel records">
          <h2>Best times by distance</h2>
          <ul className="activity-list">{[...bestTimes].map(([distanceLabel, run]) => <li className="activity-row" key={distanceLabel}>
            <div className="activity-copy"><strong>{distanceLabel}</strong><span>{shortDate(run.completedAt)}</span></div><strong>{formatTime(totalTime(run))}</strong>
          </li>)}</ul>
        </div>
      </div>}
    </section>
    <section className="section" id="training-history">
      <div className="section-heading"><h2>Training history</h2></div>
      {history.length === 0 ? <p className="workout-note">Your completed workouts and runs will appear here.</p> : <ul className="panel activity-list">
        {history.map(item => <li className="activity-row" key={item.id}><div className="activity-copy"><strong>{item.name}</strong><span>{item.detail}</span></div><time dateTime={item.date}>{shortDate(item.date)}</time></li>)}
      </ul>}
    </section>
  </>
}
