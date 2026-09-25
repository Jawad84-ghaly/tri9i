import * as Speech from 'expo-speech';
import { eventPrompt, type PromptEvent } from '../constants/darijaAudioPrompts';
import { getLanguage } from '../constants/language';
import type { Preferences } from './preferencesService';

class DarijaSpeech {
  private voice: Speech.Voice | undefined;
  private enabled = true;
  private generation = 0;
  private initialization = 0;
  private lastEvent = new Map<string, number>();
  private humor = true;
  private variants = new Map<PromptEvent, number>();
  async initialize(preferences?: Preferences): Promise<'darija' | 'arabic' | 'native' | 'missing'> {
    this.stop(); this.lastEvent.clear(); this.voice = undefined;
    this.humor = preferences?.humor ?? true;
    const initialization = ++this.initialization;
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      if (initialization !== this.initialization) return 'missing';
      const language = preferences?.language ?? getLanguage();
      const compatible = voices.filter(v => voiceMatches(v.language, language));
      this.voice = compatible.find(v => v.identifier === preferences?.voiceId)
        ?? compatible.find(v => v.language.toLowerCase().replace('_', '-') === 'ar-ma') ?? compatible[0];
      return !this.voice ? 'missing' : language !== 'darija' ? 'native' : this.voice.language.toLowerCase().replace('_', '-') === 'ar-ma' ? 'darija' : 'arabic';
    } catch { return 'missing'; }
  }
  setEnabled(value: boolean) { this.enabled = value; if (!value) this.stop(); }
  stop() { this.generation++; void Speech.stop().catch(() => {}); }
  async say(text: string, priority = false, preview = false) {
    if ((!this.enabled && !preview) || !this.voice) return false;
    const generation = priority ? ++this.generation : this.generation;
    try {
      if (priority) await Speech.stop();
      else if (await Speech.isSpeakingAsync()) return false;
      if ((!this.enabled && !preview) || generation !== this.generation) return false;
      Speech.speak(text, { language: this.voice.language, voice: this.voice.identifier, rate: 0.92,
        onError: () => { /* Visual instruction remains available. */ } });
      return true;
    } catch { return false; /* Visual guidance remains available. */ }
  }
  event(event: PromptEvent, key: string = event) {
    const now = Date.now();
    if (now - (this.lastEvent.get(key) ?? 0) < 90_000) return;
    const variant = this.variants.get(event) ?? 0;
    void this.say(eventPrompt(event, this.humor, variant), event === 'rerouting' || event === 'arrived').then(spoken => {
      if (!spoken) return;
      this.lastEvent.set(key, now);
      this.variants.set(event, variant + 1);
      if (this.lastEvent.size > 300) this.lastEvent.delete(this.lastEvent.keys().next().value!);
    });
  }
}
export function voiceMatches(locale: string, language: Preferences['language']) {
  return locale.toLowerCase().replace('_', '-').split('-')[0] === (language === 'darija' ? 'ar' : language);
}
export const speech = new DarijaSpeech();
