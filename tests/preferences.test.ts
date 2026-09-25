import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ getItem:vi.fn(), setItem:vi.fn() }));
const tts = vi.hoisted(() => ({ getAvailableVoicesAsync:vi.fn(), stop:vi.fn().mockResolvedValue(undefined), speak:vi.fn(), isSpeakingAsync:vi.fn().mockResolvedValue(false) }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default:storage }));
vi.mock('expo-speech', () => tts);
import { defaults, loadPreferences, savePreferences } from '../services/preferencesService';
import { setLanguage } from '../constants/language';
import { ui, maneuverPrompt, eventPrompt } from '../constants/darijaAudioPrompts';
import { favoriteLabels } from '../constants/settingsLabels';
import { speech } from '../services/speechService';
beforeEach(() => { vi.clearAllMocks(); setLanguage('darija'); speech.setEnabled(true); });
describe('language and voice preferences', () => {
  it('defaults to Darija and preserves settings across reloads', async () => {
    storage.getItem.mockResolvedValue(null); expect(await loadPreferences()).toEqual(defaults);
    const settings = {language:'fr' as const,voiceId:'fr-voice',humor:false};
    await savePreferences(settings); storage.getItem.mockResolvedValue(storage.setItem.mock.calls[0]![1]);
    expect(await loadPreferences()).toEqual(settings);
  });
  it('does not silently overwrite corrupt or unwritable settings', async () => {
    storage.getItem.mockResolvedValue('{bad'); await expect(loadPreferences()).rejects.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.setItem.mockRejectedValueOnce(new Error('full')); await expect(savePreferences(defaults)).rejects.toThrow('full');
  });
  it('switches interface, favorites and navigation instructions together', () => {
    const step = {type:'turn',modifier:'left',coordinate:{latitude:0,longitude:0},distance:100,geometry:[]};
    expect(ui.start).toBe('يالله نمشيو'); expect(maneuverPrompt(step)).toContain('ليسر');
    setLanguage('fr'); expect(ui.start).toBe('Démarrer'); expect(favoriteLabels.home).toContain('Maison'); expect(maneuverPrompt(step,100)).toBe('Dans 100 mètres, tournez à gauche.');
    setLanguage('en'); expect(ui.start).toBe('Start'); expect(maneuverPrompt(step)).toBe('turn left.');
  });
  it('rotates Darija humor without removing essential warnings and supports plain guidance', () => {
    expect(eventPrompt('radar',true,0)).not.toBe(eventPrompt('radar',true,1));
    expect(eventPrompt('radar',false)).toContain('رادار');
    expect(eventPrompt('radar',false)).not.toContain('طاجين');
  });
  it('uses a selected compatible voice and reports missing voices without a wrong-language fallback', async () => {
    tts.getAvailableVoicesAsync.mockResolvedValue([{identifier:'ar',language:'ar-SA'}, {identifier:'ma',language:'ar-MA'}, {identifier:'fr',language:'fr-FR'}]);
    expect(await speech.initialize(defaults)).toBe('darija'); await speech.say('نعم',true);
    expect(tts.speak.mock.calls.at(-1)?.[1].voice).toBe('ma');
    expect(await speech.initialize({...defaults,voiceId:'ar'})).toBe('arabic');
    expect(await speech.initialize({...defaults,language:'en'})).toBe('missing');
    expect(await speech.say('hello')).toBe(false);
  });
  it('voice preview does not unmute subsequent navigation', async () => {
    tts.getAvailableVoicesAsync.mockResolvedValue([{identifier:'ma',language:'ar-MA'}]);
    await speech.initialize(defaults); speech.setEnabled(false);
    expect(await speech.say('test',true,true)).toBe(true);
    expect(await speech.say('navigation',true)).toBe(false);
  });
});
