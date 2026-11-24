import { useEffect, useState } from 'react'
import { ChartNoAxesCombined, Dumbbell, Footprints, House, Zap } from 'lucide-react'
import Home from './screens/Home'
import Train from './screens/Train'
import Run from './screens/Run'
import Progress from './screens/Progress'

const tabs = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'train', label: 'Train', icon: Dumbbell },
  { id: 'run', label: 'Run', icon: Footprints },
  { id: 'progress', label: 'Progress', icon: ChartNoAxesCombined },
] as const

function readRoute() {
  const route = window.location.hash.slice(1)
  const [tab, detail] = route.split('/')
  return { tab: tabs.find(item => item.id === tab)?.id ?? 'home', detail: new URLSearchParams('detail=' + (detail ?? '')).get('detail') ?? undefined }
}

export default function App() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    function onNavigate() {
      setRoute(readRoute())
      if (window.location.hash === '#progress/history') {
        requestAnimationFrame(() => document.getElementById('training-history')?.scrollIntoView())
      } else {
        window.scrollTo(0, 0)
      }
    }
    window.addEventListener('hashchange', onNavigate)
    return () => window.removeEventListener('hashchange', onNavigate)
  }, [])

  return <>
    <header className="app-header">
      <div className="shell header-inner">
        <a href="#home" className="wordmark" aria-label="TrainCraft Home">
          <span className="logo"><Zap size={21} strokeWidth={2.6} fill="currentColor" /></span>
          <span>Train<span className="accent">Craft</span></span>
        </a>
        <span className="demo-tag"><span /> Includes sample data</span>
      </div>
    </header>
    <main className="shell main" aria-labelledby="page-title">
      {route.tab === 'home' && <Home />}
      {route.tab === 'train' && <Train detail={route.detail} />}
      {route.tab === 'run' && <Run />}
      {route.tab === 'progress' && <Progress />}
    </main>
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="nav-inner">
        {tabs.map(({ id, label, icon: Icon }) => <a key={id} href={'#' + id} aria-current={route.tab === id ? 'page' : undefined}>
          <span className="nav-icon"><Icon size={21} /></span><span>{label}</span>
        </a>)}
      </div>
    </nav>
  </>
}
