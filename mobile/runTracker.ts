import * as Location from 'expo-location'
import * as SQLite from 'expo-sqlite'
import * as TaskManager from 'expo-task-manager'
import { measureFix, type Fix } from '../src/gps'

const taskName = 'traincraft-locked-screen-run'

export type NativeRun = {
  startedAt: number
  endedAt: number | null
  meters: number
  laps: number[]
  lastFixAt: number
  error?: string
}

let database: SQLite.SQLiteDatabase | undefined
let anchor: Fix | null = null

function db() {
  if (!database) {
    database = SQLite.openDatabaseSync('traincraft-gps.db')
    database.execSync('CREATE TABLE IF NOT EXISTS tracker (id INTEGER PRIMARY KEY, run TEXT NOT NULL)')
  }
  return database
}

export function readRun(): NativeRun | null {
  const row = db().getFirstSync<{ run: string }>('SELECT run FROM tracker WHERE id = 1')
  return row ? JSON.parse(row.run) as NativeRun : null
}

function writeRun(run: NativeRun) {
  db().runSync('INSERT OR REPLACE INTO tracker (id, run) VALUES (1, ?)', JSON.stringify(run))
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(taskName, async ({ data, error }) => {
  const run = readRun()
  if (!run || run.endedAt !== null) return
  if (error) {
    writeRun({ ...run, error: error.message })
    return
  }

  const fixes = [...(data?.locations ?? [])].sort((a, b) => a.timestamp - b.timestamp)
  for (const location of fixes) {
    if (location.timestamp <= Math.max(run.startedAt, run.lastFixAt)) continue
    const fix: Fix = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? Infinity,
      timestamp: location.timestamp,
    }
    const previous = anchor
    const { anchor: nextAnchor, meters } = measureFix(previous, fix)
    anchor = nextAnchor
    if (previous && meters > 0) {
      const nextDistance = run.meters + meters
      while (nextDistance >= (run.laps.length + 1) * 1000) {
        const remaining = (run.laps.length + 1) * 1000 - run.meters
        const crossing = previous.timestamp + remaining / meters * (fix.timestamp - previous.timestamp)
        const previousLaps = run.laps.reduce((sum, lap) => sum + lap, 0)
        run.laps.push(Math.max(0, (crossing - run.startedAt) / 1000 - previousLaps))
      }
      run.meters = nextDistance
    }
    run.lastFixAt = fix.timestamp
    delete run.error
  }
  writeRun(run)
})

export async function startRun() {
  if (await Location.hasStartedLocationUpdatesAsync(taskName)) {
    await Location.stopLocationUpdatesAsync(taskName)
  }
  const foreground = await Location.requestForegroundPermissionsAsync()
  if (!foreground.granted) throw new Error('Allow location access to start a GPS run.')
  const background = await Location.requestBackgroundPermissionsAsync()
  if (!background.granted) throw new Error('Enable Always location access in Settings to test tracking with the screen locked.')

  anchor = null
  await Location.startLocationUpdatesAsync(taskName, {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.Fitness,
    distanceInterval: 3,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  })
  writeRun({ startedAt: Date.now(), endedAt: null, meters: 0, laps: [], lastFixAt: 0 })
}

export async function stopRun() {
  const run = readRun()
  if (run && run.endedAt === null) writeRun({ ...run, endedAt: Date.now() })
  anchor = null
  if (await Location.hasStartedLocationUpdatesAsync(taskName)) {
    await Location.stopLocationUpdatesAsync(taskName)
  }
}
