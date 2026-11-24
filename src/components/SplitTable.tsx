import { formatTime, raceGap, raceGapLabel, splitPlan, type PacePlan, type RaceReference } from '../running'

export default function SplitTable({ plan, laps, race, plannedLaps }: { plan: PacePlan; laps: number[]; race?: RaceReference; plannedLaps?: number[] }) {
  return <div className="panel table-panel"><table>
    <thead><tr><th scope="col">At ({plan.unit})</th><th scope="col">{race ? 'Past run' : 'Target'}</th><th scope="col">Actual</th><th scope="col">{race ? 'Race gap' : 'Difference'}</th></tr></thead>
    <tbody>{splitPlan(plan).map(({ end, seconds }, index) => {
      const actual = laps[index]
      const target = race?.laps[index] ?? plannedLaps?.[index] ?? seconds
      const delta = actual === undefined ? undefined : race ? raceGap(laps, race, index + 1) : Math.round(actual) - target
      return <tr key={end}>
        <th scope="row">{end}</th><td>{formatTime(target)}</td>
        <td>{actual === undefined ? '—' : formatTime(actual)}</td>
        <td>{delta === undefined ? '—' : race ? raceGapLabel(delta) : delta === 0 ? 'On pace' : formatTime(delta) + (delta > 0 ? ' slower' : ' faster')}</td>
      </tr>
    })}</tbody>
  </table></div>
}
