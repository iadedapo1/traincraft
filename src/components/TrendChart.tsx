type Point = { date: string; value: number }

export default function TrendChart({ points, format }: { points: Point[]; format: (value: number) => string }) {
  const displayed = points.slice(-8)
  const low = Math.min(...displayed.map(point => point.value))
  const high = Math.max(...displayed.map(point => point.value))
  const positions = displayed.map((point, index) => ({
    x: displayed.length === 1 ? 224 : 24 + index * 400 / (displayed.length - 1),
    y: high === low ? 75 : 125 - (point.value - low) * 100 / (high - low),
  }))
  return <>
    <svg className="trend-chart" viewBox="0 0 448 150" role="img" aria-label={displayed.map(point => point.date + ' ' + format(point.value)).join(', ')}>
      {[25, 75, 125].map(y => <line key={y} x1="24" x2="424" y1={y} y2={y} stroke="#333733" strokeDasharray="4 5" />)}
      <polyline points={positions.map(({ x, y }) => x + ',' + y).join(' ')} stroke="currentColor" strokeWidth="3" fill="none" />
      {positions.map(({ x, y }, index) => <circle key={index} cx={x} cy={y} r="5" fill="currentColor"><title>{displayed[index].date} · {format(displayed[index].value)}</title></circle>)}
    </svg>
    <div className="chart-labels"><span>{displayed[0].date}</span><span>{displayed.length > 1 && displayed[displayed.length - 1].date}</span></div>
  </>
}
