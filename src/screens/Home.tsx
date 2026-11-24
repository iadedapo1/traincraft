import { CalendarDays, Dumbbell, Footprints, Play, Target } from 'lucide-react'
import { ActivityList, Duration, Metric, PageHeading } from '../components/UI'
import { activity, routines } from '../sampleData'

export default function Home() {
  const routine = routines[0]
  return <>
    <PageHeading eyebrow="MONDAY, NOVEMBER 23" title="Training Overview" description="See what’s on deck and how your training is shaping up." />
    <div className="home-grid">
      <section className="hero" aria-labelledby="planned-title">
        <div className="hero-content">
          <span className="eyebrow inline-icon"><CalendarDays size={16} /> TODAY’S PLAN</span>
          <h2 id="planned-title">Upper Body<br />Strength</h2>
          <div className="hero-meta"><Duration>{routine.duration}</Duration><span className="inline-icon"><Dumbbell size={16} /> {routine.exercises.length} exercises</span></div>
          <a className="button primary" href="#train/workout"><Play size={16} fill="currentColor" /> Start workout</a>
        </div>
      </section>
      <section className="shortcuts" aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title">Quick start</h2>
        <a className="panel shortcut" href="#train"><span className="icon-box strength"><Dumbbell size={21} /></span><span><strong>Browse routines</strong><small>Choose your next lift</small></span></a>
        <a className="panel shortcut" href="#run"><span className="icon-box run"><Footprints size={21} /></span><span><strong>Start a run</strong><small>Plan your pace and record splits</small></span></a>
      </section>
    </div>
    <section className="section">
      <div className="section-heading"><h2>Last week</h2><a href="#progress">View progress</a></div>
      <div className="metrics">
        <Metric icon={<Dumbbell size={19} />} label="Sessions" value="4" />
        <Metric icon={<Footprints size={19} />} label="Distance run" value="13.6" unit="km" />
        <Metric icon={<Target size={19} />} label="Personal records" value="2" />
      </div>
    </section>
    <section className="section">
      <div className="section-heading"><h2>Recent activity</h2><a href="#progress/history">View history</a></div>
      <ActivityList items={activity.slice(0, 3)} />
    </section>
  </>
}
