export type Fix = { latitude: number; longitude: number; accuracy: number; timestamp: number }

const radians = Math.PI / 180

function distanceBetween(from: Fix, to: Fix) {
  const latitude = (to.latitude - from.latitude) * radians
  const longitude = (to.longitude - from.longitude) * radians
  const chord = Math.sin(latitude / 2) ** 2
    + Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin(longitude / 2) ** 2
  return 12_742_000 * Math.asin(Math.sqrt(Math.min(1, chord)))
}

export function measureFix(previous: Fix | null, current: Fix) {
  if (!Number.isFinite(current.accuracy) || current.accuracy > 30) return { anchor: previous, meters: 0, status: 'weak' as const }
  if (!previous || current.timestamp - previous.timestamp > 30_000) return { anchor: current, meters: 0 }
  const seconds = (current.timestamp - previous.timestamp) / 1000
  if (seconds <= 0) return { anchor: previous, meters: 0 }
  const meters = distanceBetween(previous, current)
  // Ignore ordinary location jitter and jumps too fast for a running workout.
  if (meters < Math.max(4, 0.35 * Math.max(previous.accuracy, current.accuracy))) return { anchor: previous, meters: 0 }
  if (meters / seconds > 12) return { anchor: previous, meters: 0, status: 'weak' as const }
  return { anchor: current, meters }
}

export function recordGpsSplits({
  previousMeters, segmentMeters, fromSeconds, toSeconds, laps, targets,
}: {
  previousMeters: number
  segmentMeters: number
  fromSeconds: number
  toSeconds: number
  laps: number[]
  targets: number[]
}) {
  const meters = Math.min(previousMeters + segmentMeters, targets[targets.length - 1])
  const nextLaps = [...laps]
  let elapsed = nextLaps.reduce((sum, lap) => sum + lap, 0)
  while (nextLaps.length < targets.length && meters >= targets[nextLaps.length]) {
    const fraction = (targets[nextLaps.length] - previousMeters) / segmentMeters
    const crossing = fromSeconds + fraction * (toSeconds - fromSeconds)
    nextLaps.push(Math.max(0, crossing - elapsed))
    elapsed = Math.max(elapsed, crossing)
  }
  return { meters, laps: nextLaps, finishedAt: nextLaps.length === targets.length ? elapsed : null }
}
