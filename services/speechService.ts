import * as Speech from 'expo-speech';
import { eventPrompt, type PromptEvent } from '../constants/darijaAudioPrompts';

class DarijaSpeech {
  private voice: Speech.Voice | undefined;
  private enabled = true;
  private generation = 0;
  private lastEvent = new Map<string, number>();
  async initialize(): Promise<'darija' | 'arabic' | 'missing'> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      this.voice = voices.find(v => v.language.toLowerCase().replace('_', '-') === 'ar-ma')
        ?? voices.find(v => /^ar[-_]|^ar$/.test(v.language.toLowerCase()));
      return !this.voice ? 'missing' : this.voice.language.toLowerCase().replace('_', '-') === 'ar-ma' ? 'darija' : 'arabic';
    } catch { return 'missing'; }
  }
  setEnabled(value: boolean) { this.enabled = value; if (!value) this.stop(); }
  stop() { this.generation++; void Speech.stop().catch(() => {}); }
  async say(text: string, priority = false) {
    if (!this.enabled || !this.voice) return false;
    const generation = priority ? ++this.generation : this.generation;
    try {
      if (priority) await Speech.stop();
      else if (await Speech.isSpeakingAsync()) return false;
      if (!this.enabled || generation !== this.generation) return false;
      Speech.speak(text, { language: this.voice.language, voice: this.voice.identifier, rate: 0.92,
        onError: () => { /* Visual instruction remains available. */ } });
      return true;
    } catch { return false; /* Visual guidance remains available. */ }
  }
  event(event: PromptEvent, key: string = event) {
    const now = Date.now();
    if (now - (this.lastEvent.get(key) ?? 0) < 90_000) return;
    void this.say(eventPrompt(event), event === 'rerouting' || event === 'arrived').then(spoken => {
      if (!spoken) return;
      this.lastEvent.set(key, now);
      if (this.lastEvent.size > 300) this.lastEvent.delete(this.lastEvent.keys().next().value!);
    });
  }
}
export const speech = new DarijaSpeech();
