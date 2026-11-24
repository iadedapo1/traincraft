import { raceCue, raceGap, type RaceReference } from './running'

export function canSpeak() {
  return typeof window.SpeechSynthesisUtterance === 'function' && !!window.speechSynthesis
}

export function stopSpeech() {
  if (canSpeak()) window.speechSynthesis.cancel()
}

export function speakRaceCue(message: string) {
  if (!canSpeak()) return
  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang = 'en'
  const voice = window.speechSynthesis.getVoices().find(item => item.localService && item.lang.startsWith('en'))
  if (voice) utterance.voice = voice
  stopSpeech()
  window.speechSynthesis.speak(utterance)
}

export function announceRaceSplit(race: RaceReference | undefined, audio: boolean | undefined, laps: number[], previousCount: number) {
  if (!race || !audio || laps.length <= previousCount) return
  speakRaceCue(raceCue(raceGap(laps, race), laps.length === race.laps.length))
}
