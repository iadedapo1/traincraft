import type { Workout } from './workoutStorage'

export type Target = {
  sets: number
  minReps: number
  maxReps: number
  increment: number
}

export function recommendWeight(history: Workout[], exercise: string, unit: Workout['unit'], target: Target) {
  const last = history.find(workout => workout.sets.some(set => set.exercise === exercise))
  if (!last) return null

  const sets = last.sets.filter(set => set.exercise === exercise)
  const heaviest = Math.max(...sets.map(set => set.weight))
  const atTop = sets.filter(set => set.weight === heaviest && set.reps >= target.maxReps).length
  const converted = last.unit === unit ? heaviest : unit === 'kg' ? heaviest / 2.20462262 : heaviest * 2.20462262
  const increase = atTop >= target.sets
  return {
    weight: Number((converted + (increase ? target.increment : 0)).toFixed(2)),
    increase,
  }
}
