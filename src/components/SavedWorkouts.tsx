import { useEffect, useState } from 'react'
import { loadWorkouts, type Workout } from '../workoutStorage'

export default function SavedWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>()
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    loadWorkouts().then(
      items => { if (active) setWorkouts(items) },
      () => { if (active) setError(true) },
    )
    return () => { active = false }
  }, [])

  return <section className="section">
    <div className="section-heading"><h2>Saved on this device</h2></div>
    {error && <p role="alert">Saved workouts are unavailable in this browser.</p>}
    {!workouts && !error && <p role="status">Loading workouts…</p>}
    {workouts?.length === 0 && <p className="workout-note">Your completed workouts will appear here.</p>}
    {workouts?.map(workout => <details className="panel routine saved-workout" key={workout.id}>
      <summary><span className="activity-copy"><strong>{workout.name}</strong><span>{workout.sets.length} sets · {new Date(workout.completedAt).toLocaleDateString()}</span></span></summary>
      <ul className="exercise-list">{workout.sets.map((set, index) => <li key={index}><span>{set.exercise}</span><span>{set.reps} reps · {set.weight} {workout.unit}</span></li>)}</ul>
    </details>)}
  </section>
}
