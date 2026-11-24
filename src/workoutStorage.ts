import type { RunRecord } from './running'

export type WorkoutSet = {
  exercise: string
  reps: number
  weight: number
}

export type Workout = {
  id: string
  name: string
  completedAt: string
  unit: 'lb' | 'kg'
  sets: WorkoutSet[]
}

export type WorkoutDraft = Omit<Workout, 'completedAt'>

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('traincraft', 3)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('workouts')) db.createObjectStore('workouts', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'name' })
      db.createObjectStore('runs', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function useTransaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(stores, mode)
      const request = run(transaction)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error)
      transaction.onerror = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function saveWorkout(workout: Workout) {
  await useTransaction(['workouts', 'drafts'], 'readwrite', transaction => {
    const drafts = transaction.objectStore('drafts')
    const existing = drafts.get(workout.name)
    existing.onsuccess = () => {
      if (existing.result?.id === workout.id) drafts.delete(workout.name)
    }
    return transaction.objectStore('workouts').put(workout)
  })
}

export async function loadWorkouts(): Promise<Workout[]> {
  const workouts = await useTransaction(['workouts'], 'readonly', transaction => transaction.objectStore('workouts').getAll())
  return workouts.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
}

export function loadDraft(name: string): Promise<WorkoutDraft | undefined> {
  return useTransaction(['drafts'], 'readonly', transaction => transaction.objectStore('drafts').get(name))
}

export async function saveDraft(draft: WorkoutDraft) {
  await useTransaction(['drafts'], 'readwrite', transaction => transaction.objectStore('drafts').put(draft))
}

export async function loadRuns(): Promise<RunRecord[]> {
  const runs = await useTransaction(['runs'], 'readonly', transaction => transaction.objectStore('runs').getAll())
  return runs.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
}

export async function saveRun(run: RunRecord) {
  await useTransaction(['runs'], 'readwrite', transaction => transaction.objectStore('runs').put(run))
}
