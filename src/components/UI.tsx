import type { ReactNode } from 'react'
import { Clock3, Dumbbell, Footprints } from 'lucide-react'
import { activity } from '../sampleData'

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="page-heading">
    <div className="eyebrow">{eyebrow}</div>
    <h1 id="page-title">{title}</h1>
    <p>{description}</p>
  </header>
}

export function ActivityList({ items }: { items: readonly (typeof activity)[number][] }) {
  return <ul className="panel activity-list">
    {items.map(({ name, kind, date, detail }) => {
      const Icon = kind === 'run' ? Footprints : Dumbbell
      return <li className="activity-row" key={name + date}>
        <span className={'icon-box ' + kind}><Icon size={19} /></span>
        <div className="activity-copy"><strong>{name}</strong><span>{detail}</span></div>
        <time>{date}</time>
      </li>
    })}
  </ul>
}

export function Metric({ icon, label, value, unit }: { icon: ReactNode; label: string; value: string; unit?: string }) {
  return <div className="panel metric">
    <span className="metric-icon">{icon}</span>
    <div className="metric-value">{value}{unit && <span> {unit}</span>}</div>
    <div className="metric-label">{label}</div>
  </div>
}

export function Duration({ children }: { children: ReactNode }) {
  return <span className="inline-icon"><Clock3 size={16} />{children}</span>
}
