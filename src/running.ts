export type DistanceUnit = 'km' | 'mi'
export type Strategy = 'even' | 'negative' | 'positive'
export type PacePlan = { distance: number; unit: DistanceUnit; seconds: number; strategy: Strategy }
export type RaceReference = { completedAt: string; laps: number[] }
export type RunRecord = PacePlan & { id: string; completedAt: string; laps: number[]; race?: RaceReference; stoppedEarly?: boolean; plannedLaps?: number[] }

export function formatTime(seconds: number) {
  const rounded = Math.round(Math.abs(seconds))
  const minutes = Math.floor(rounded / 60)
  return minutes + ':' + String(rounded % 60).padStart(2, '0')
}

export function parseTime(value: string) {
  if (!/^\d{1,4}:[0-5]\d$/.test(value.trim())) return 0
  const [minutes, seconds] = value.trim().split(':').map(Number)
  return minutes * 60 + seconds
}

export function splitPlan(plan: PacePlan) {
  const slope = { even: 0, negative: -0.1, positive: 0.1 }[plan.strategy]
  let previous = 0
  return Array.from({ length: Math.ceil(plan.distance) }, (_, index) => {
    const end = Math.min(index + 1, plan.distance)
    const fraction = end / plan.distance
    const cumulative = Math.round(plan.seconds * (fraction + slope * (fraction * fraction - fraction)))
    const seconds = cumulative - previous
    previous = cumulative
    return { end, seconds }
  })
}

export function totalTime(run: RunRecord) {
  return run.laps.reduce((sum, lap) => sum + lap, 0)
}

export function kilometers(run: PacePlan) {
  return run.distance * (run.unit === 'mi' ? 1.609344 : 1)
}

export function raceGap(laps: number[], reference: RaceReference, count = laps.length) {
  const elapsed = laps.slice(0, count).reduce((sum, lap) => sum + lap, 0)
  const target = reference.laps.slice(0, count).reduce((sum, lap) => sum + lap, 0)
  const gap = elapsed - target
  return Math.sign(gap) * Math.round(Math.abs(gap)) || 0
}

export function raceGapLabel(gap: number) {
  if (gap === 0) return 'Tied'
  return (gap < 0 ? 'Ahead by ' : 'Behind by ') + formatTime(gap)
}

export function raceCue(gap: number, finished: boolean) {
  if (gap === 0) return finished ? 'Finished tied.' : 'You’re tied.'
  const seconds = Math.abs(gap)
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  const duration = [
    minutes > 0 ? minutes + (minutes === 1 ? ' minute' : ' minutes') : '',
    remainder > 0 ? remainder + (remainder === 1 ? ' second' : ' seconds') : '',
  ].filter(Boolean).join(' and ')
  return (finished ? 'Finished ' : '') + duration + (gap < 0 ? ' ahead.' : ' behind.')
}

export function shortenRun(plan: PacePlan, laps: number[], distance: number, elapsed: number) {
  const splits = splitPlan(plan)
  const last = splits[laps.length - 1]?.end ?? 0
  const next = splits[laps.length]
  if (!next || !Number.isFinite(distance) || distance <= 0 || distance < last || distance >= next.end) return null

  const plannedLaps = splits.slice(0, laps.length).map(split => split.seconds)
  const actual = [...laps]
  if (distance > last) {
    const remainder = elapsed - laps.reduce((sum, lap) => sum + lap, 0)
    if (remainder <= 0) return null
    plannedLaps.push(Math.round(next.seconds * (distance - last) / (next.end - last)))
    actual.push(remainder)
  }
  return { ...plan, distance, seconds: plannedLaps.reduce((sum, split) => sum + split, 0), laps: actual, stoppedEarly: true, plannedLaps }
}
