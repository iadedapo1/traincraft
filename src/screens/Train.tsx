import { useState } from 'react'
import { Dumbbell, ListChecks } from 'lucide-react'
import { ActivityList, Duration, PageHeading } from '../components/UI'
import SavedWorkouts from '../components/SavedWorkouts'
import WorkoutLog from '../components/WorkoutLog'
import { activity, routines } from '../sampleData'

export default function Train({ detail }: { detail?: string }) {
  const [search, setSearch] = useState('')
  const routine = routines[0]
  const library = routines.flatMap(item => item.exercises)
  const results = library.filter(exercise => exercise.name.toLowerCase().includes(search.trim().toLowerCase()))

  const workout = detail === 'workout' ? routine : routines.find(item => item.name === detail)
  if (workout) return <WorkoutLog key={workout.name} name={workout.name} exercises={workout.exercises} />

  if (detail === 'saved') return <>
    <PageHeading eyebrow="STRENGTH" title="Workout saved" description="Your completed sets are stored in this browser." />
    <SavedWorkouts />
    <a className="button secondary section" href="#train">Back to routines</a>
  </>

  return <>
    <PageHeading eyebrow="STRENGTH" title="Train" description="Browse routines and see what your next session looks like." />
    <section className="section">
      <div className="section-heading"><h2>Workout routines</h2></div>
      <div className="two-columns">{routines.map(item => <details className="panel routine" key={item.name}>
        <summary>
          <span className="icon-box strength"><Dumbbell size={20} /></span>
          <span className="activity-copy"><strong>{item.name}</strong><span>{item.focus} · {item.exercises.length} exercises</span></span>
          <Duration>{item.duration}</Duration>
        </summary>
        <ul className="exercise-list">{item.exercises.map(exercise => <li key={exercise.name}><span>{exercise.name}</span><span>{exercise.sets} × {exercise.minReps}{exercise.maxReps !== exercise.minReps && `–${exercise.maxReps}`}{exercise.perSide && ' per side'}</span></li>)}</ul>
        <a className="button secondary routine-action" href={'#train/' + encodeURIComponent(item.name)}>Log workout</a>
      </details>)}</div>
    </section>
    <section className="section">
      <div className="section-heading"><h2>Exercise library</h2></div>
      <label className="search-label">Find an exercise<input type="search" placeholder="Search exercises" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <ul className="panel activity-list library">
        {results.map(exercise => <li className="activity-row" key={exercise.name}><ListChecks size={18} className="accent" /><span>{exercise.name}</span></li>)}
        {results.length === 0 && <li className="activity-row">No exercises match your search.</li>}
      </ul>
    </section>
    <SavedWorkouts />
    <section className="section">
      <div className="section-heading"><h2>Sample workout history</h2></div>
      <ActivityList items={activity.filter(item => item.kind === 'strength')} />
    </section>
  </>
}
