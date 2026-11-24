import { useEffect, useState } from 'react'
import { measureFix, type Fix } from './gps'

export type GpsSegment = { meters: number; from: number; to: number }

export function useRunLocation(active: boolean, onSegment: (segment: GpsSegment) => void) {
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!active) return
    if (!window.isSecureContext || !navigator.geolocation) {
      setStatus('GPS needs a supported phone browser and the HTTPS TrainCraft link. You can switch to manual laps.')
      return
    }

    let live = true
    let anchor: Fix | null = null
    let wakeLock: WakeLockSentinel | null = null

    async function keepScreenOn() {
      if (!navigator.wakeLock || wakeLock || document.hidden) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (!live || document.hidden) {
          await lock.release()
          return
        }
        wakeLock = lock
        lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null })
      } catch {
        // The runner can keep the screen on manually.
      }
    }

    function onVisibility() {
      anchor = null
      setStatus(document.hidden ? 'GPS distance updates stop while TrainCraft is hidden.' : 'Reconnecting to GPS…')
      if (!document.hidden) void keepScreenOn()
    }

    setStatus('Looking for a GPS signal…')
    void keepScreenOn()
    document.addEventListener('visibilitychange', onVisibility)
    const watch = navigator.geolocation.watchPosition(position => {
      if (!live || document.hidden) return
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      }
      const previous = anchor
      const result = measureFix(previous, current)
      anchor = result.anchor
      setStatus(result.status === 'weak' ? 'GPS signal is weak. Waiting for a better reading…' : 'GPS tracking active')
      if (previous && result.meters > 0) {
        onSegment({ meters: result.meters, from: previous.timestamp, to: current.timestamp })
      }
    }, error => {
      if (!live) return
      anchor = null
      setStatus(error.code === 1
        ? 'Location access was denied. Allow it in your browser settings or switch to manual laps.'
        : 'GPS is temporarily unavailable. Move into the open or switch to manual laps.')
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 })

    return () => {
      live = false
      document.removeEventListener('visibilitychange', onVisibility)
      navigator.geolocation.clearWatch(watch)
      void wakeLock?.release().catch(() => {})
    }
  }, [active, onSegment])

  return active ? status : ''
}
