import type { FormEvent } from 'react'
import type { Target } from '../progression'

export default function ProgressionSettings({ target, unit, onSave }: {
  target: Target
  unit: string
  onSave: (target: Target) => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSave({
      sets: Number(data.get('sets')),
      minReps: Number(data.get('min')),
      maxReps: Number(data.get('max')),
      increment: Number(data.get('increment')),
    })
  }

  return <details className="panel routine progression-settings">
    <summary>Adjust exercise targets</summary>
    <form className="workout-form" onSubmit={submit}>
      <div className="target-fields">
        <label>Sets<input name="sets" type="number" min="1" step="1" defaultValue={target.sets} required /></label>
        <label>Min reps<input name="min" type="number" min="1" step="1" defaultValue={target.minReps} required /></label>
        <label>Max reps<input name="max" type="number" min="1" step="1" defaultValue={target.maxReps} required /></label>
        <label>Increase ({unit})<input name="increment" type="number" min="0.01" step="any" defaultValue={target.increment} required /></label>
      </div>
      <button className="button secondary" type="submit">Save targets</button>
    </form>
  </details>
}
