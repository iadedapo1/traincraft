import { useEffect, useState } from 'react'
import { AppState, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { formatTime } from '../src/running'
import { readRun, startRun, stopRun } from './runTracker'

export default function App() {
  const [run, setRun] = useState(readRun)
  const [now, setNow] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = !!run && run.endedAt === null

  function refresh() {
    setRun(readRun())
    setNow(Date.now())
  }

  useEffect(() => {
    const interval = setInterval(() => { if (AppState.currentState === 'active') refresh() }, 1000)
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh() })
    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [])

  async function toggleRun() {
    setBusy(true)
    setError('')
    try {
      if (active) await stopRun()
      else await startRun()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not change GPS tracking.')
    } finally {
      refresh()
      setBusy(false)
    }
  }

  const elapsed = run ? Math.max(0, ((run.endedAt ?? now) - run.startedAt) / 1000) : 0
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
    <StatusBar barStyle="light-content" />
    <Text style={styles.brand}>TrainCraft</Text>
    <Text accessibilityRole="header" style={styles.title}>Locked-screen GPS</Text>
    <Text style={styles.copy}>Start a run outdoors, wait for a GPS reading, then lock the screen. Unlock it after moving to check your distance.</Text>
    <View style={styles.card}>
      <Text style={styles.distance}>{((run?.meters ?? 0) / 1000).toFixed(2)} km</Text>
      <Text style={styles.time}>{formatTime(elapsed)}</Text>
      <Text style={styles.copy}>{active ? run.lastFixAt ? 'Last GPS update ' + new Date(run.lastFixAt).toLocaleTimeString() : 'Waiting for a GPS reading…' : run ? 'Run stopped. The latest result is saved on this device.' : 'Ready to start'}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={toggleRun} style={[styles.button, busy && styles.disabled]}>
      <Text style={styles.buttonText}>{busy ? 'Please wait…' : active ? 'Stop run' : 'Start GPS run'}</Text>
    </Pressable>
    {(error || run?.error) && <Text accessibilityRole="alert" style={styles.copy}>{error || run?.error}</Text>}
    {!!run?.laps.length && <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.time}>Splits</Text>
      {run.laps.map((seconds, index) => <Text key={index} style={styles.copy}>{index + 1} km · {formatTime(seconds)}</Text>)}
    </View>}
  </ScrollView>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101110' },
  content: { padding: 22, paddingTop: 68, gap: 15 },
  brand: { color: '#c5fb52', fontSize: 18, fontWeight: '800' },
  title: { color: '#f2f4ef', fontSize: 32, fontWeight: '800' },
  copy: { color: '#b9beb5', fontSize: 16, lineHeight: 24 },
  card: { padding: 18, backgroundColor: '#191b19', borderRadius: 16, gap: 8 },
  distance: { color: '#c5fb52', fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  time: { color: '#f2f4ef', fontSize: 20, fontWeight: '700' },
  button: { backgroundColor: '#c5fb52', borderRadius: 12, padding: 15, alignItems: 'center' },
  buttonText: { color: '#151b0b', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.55 },
})
