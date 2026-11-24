import { useEffect, useState, type FormEvent } from 'react'
import { PageHeading } from './UI'
import ProgressionSettings from './ProgressionSettings'
import { recommendWeight, type Target } from '../progression'
import { loadDraft, loadWorkouts, saveDraft, saveWorkout, type Workout, type WorkoutDraft, type WorkoutSet } from '../workoutStorage'

type Exercise = Omit<Target, 'increment'> & { name: string; perSide?: boolean }

export default function WorkoutLog({ name, exercises }: { name: string; exercises: Exercise[] }) {
  const [id, setId] = useState<string>(() => crypto.randomUUID?.() ?? Date.now() + '-' + Math.random())
  const [exerciseName, setExerciseName] = useState(exercises[0].name)
  const [history, setHistory] = useState<Workout[]>([])
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb')
  const [sets, setSets] = useState<WorkoutSet[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([loadDraft(name), loadWorkouts()]).then(([draft, workouts]) => {
      if (!active) return
      if (draft?.sets.length) {
        setId(draft.id)
        setSets(draft.sets)
        setUnit(draft.unit)
        setExerciseName(draft.sets[draft.sets.length - 1].exercise)
        setNotice('Unfinished workout restored.')
      }
      setHistory(workouts)
      setReady(true)
    }).catch(() => {
      if (active) setError('Could not open workout storage. Reload to try again.')
    })
    return () => { active = false }
  }, [name])

  const exercise = exercises.find(item => item.name === exerciseName) ?? exercises[0]
  const settingsKey = 'traincraft:target:' + exercise.name + ':' + unit
  const [preferences, setPreferences] = useState<Record<string, Target>>({})
  const defaults = { sets: exercise.sets, minReps: exercise.minReps, maxReps: exercise.maxReps, increment: unit === 'kg' ? 2.5 : 5 }
  let target = preferences[settingsKey] ?? defaults
  try {
    const stored = localStorage.getItem(settingsKey)
    if (stored && !preferences[settingsKey]) target = JSON.parse(stored) as Target
  } catch {
    // Keep defaults if preferences are unavailable.
  }
  const recommendation = recommendWeight(history, exercise.name, unit, target)

  function updateTarget(next: Target) {
    if (next.maxReps < next.minReps) {
      setError('Maximum reps must be at least the minimum.')
      return
    }
    try {
      localStorage.setItem(settingsKey, JSON.stringify(next))
      setPreferences(previous => ({ ...previous, [settingsKey]: next }))
      setError('')
      setNotice('Exercise targets saved.')
    } catch {
      setError('Could not save exercise targets.')
    }
  }

  async function updateSets(next: WorkoutSet[]) {
    setSaving(true)
    setError('')
    try {
      const draft: WorkoutDraft = { id, name, unit, sets: next }
      await saveDraft(draft)
      setSets(next)
      setNotice('Workout autosaved.')
    } catch {
      setError('Could not autosave this change. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function addSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const exercise = String(data.get('exercise'))
    const reps = Number(data.get('reps'))
    const weight = Number(data.get('weight'))
    void updateSets([...sets, { exercise, reps, weight }])
  }

  async function finish() {
    setSaving(true)
    setError('')
    try {
      await saveWorkout({ id, name, unit, sets, completedAt: new Date().toISOString() })
      window.location.hash = 'train/saved'
    } catch {
      setError('The workout could not be saved. Keep this page open and try again.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <PageHeading eyebrow="WORKOUT LOG" title={name} description="Sets autosave as you go. Finish to add the workout to your history." />
    <form className="panel workout-form" onSubmit={addSet}>
      <fieldset className="log-fields" disabled={!ready || saving}>
      <label>Exercise<select name="exercise" value={exerciseName} onChange={event => { setExerciseName(event.target.value); setWeight('') }}>{exercises.map(exercise => <option key={exercise.name}>{exercise.name}</option>)}</select></label>
      <div className="workout-fields">
        <label>Reps<input type="number" name="reps" inputMode="numeric" min="1" step="1" required /></label>
        <label>Weight<input type="number" name="weight" inputMode="decimal" min="0" step="any" value={weight} onChange={event => setWeight(event.target.value)} required /></label>
        <label>Unit<select value={unit} disabled={sets.length > 0 || saving} onChange={event => { setUnit(event.target.value === 'kg' ? 'kg' : 'lb'); setWeight('') }}><option value="lb">lb</option><option value="kg">kg</option></select></label>
      </div>
      <div className="target-summary">
        <strong>Target · {target.sets} sets × {target.minReps === target.maxReps ? target.maxReps : `${target.minReps}–${target.maxReps}`} reps{exercise.perSide && ' per side'}</strong>
        {recommendation ? <>
          <span>{recommendation.increase ? 'Rep target met last time.' : 'Repeat your last heaviest weight.'}</span>
          <button type="button" className="button secondary" onClick={() => setWeight(String(recommendation.weight))}>Use {recommendation.weight} {unit}</button>
        </> : <span>Log this exercise to get a weight suggestion next time.</span>}
      </div>
      <button className="button secondary" type="submit">Add set</button>
      </fieldset>
    </form>
    <ProgressionSettings key={settingsKey} target={target} unit={unit} onSave={updateTarget} />
    <section className="section">
      <h2>Completed sets</h2>
      {sets.length === 0 ? <p className="workout-note">Add a set to start your log.</p> : <ol className="panel activity-list set-list">
        {sets.map((set, index) => <li className="activity-row" key={index}>
          <div className="activity-copy"><strong>{set.exercise}</strong><span>{set.reps} reps · {set.weight} {unit}</span></div>
          <button className="button secondary" type="button" disabled={saving} aria-label={'Remove set ' + (index + 1) + ' of ' + set.exercise} onClick={() => void updateSets(sets.filter((_, position) => position !== index))}>Remove</button>
        </li>)}
      </ol>}
      {notice && <p role="status" className="workout-note">{notice}</p>}
      {error && <p role="alert" className="workout-note">{error}</p>}
      <button className="button primary section" type="button" onClick={finish} disabled={saving || sets.length === 0}>{saving ? 'Saving workout…' : 'Save workout'}</button>
    </section>
  </>
}
