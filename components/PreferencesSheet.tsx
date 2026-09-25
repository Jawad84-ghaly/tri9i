import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { languages, type Language } from '../constants/language';
import { labels } from '../constants/settingsLabels';
import { ui } from '../constants/darijaAudioPrompts';
import type { Preferences } from '../services/preferencesService';
import { speech, voiceMatches } from '../services/speechService';

export function PreferencesSheet({ value, disabled, onSave }: { value: Preferences; disabled: boolean; onSave: (p: Preferences) => Promise<void> }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(value);
  const [voices, setVoices] = useState<Speech.Voice[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (open) void Speech.getAvailableVoicesAsync().then(setVoices).catch(() => setVoices([])); }, [open]);
  async function save() {
    setBusy(true); setError('');
    try { await onSave(draft); setOpen(false); } catch { setError(labels.saveFailed); }
    finally { setBusy(false); }
  }
  function close() { if (!busy) { speech.stop(); void speech.initialize(value); setOpen(false); } }
  const choice = (title: string, action: () => void, selected = false) => <Pressable accessibilityRole="button"
    accessibilityState={{ selected }} disabled={busy} onPress={action} style={[styles.button, selected && styles.selected]}><Text style={styles.text}>{title}</Text></Pressable>;
  return <>
    <Pressable accessibilityRole="button" disabled={disabled} style={styles.button} onPress={() => { setDraft(value); setError(''); setOpen(true); }}><Text style={styles.text}>{labels.settings}</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}><SafeAreaView style={styles.sheet}><ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{labels.language}</Text>
        {(Object.keys(languages) as Language[]).map(language => <View key={language}>{choice(languages[language], () => setDraft({ ...draft, language, voiceId:'' }), draft.language === language)}</View>)}
        <Text style={styles.title}>{labels.voice}</Text>
        {choice(labels.auto, () => setDraft({ ...draft, voiceId:'' }), !draft.voiceId)}
        {voices.filter(v => voiceMatches(v.language, draft.language)).map(v => <View key={v.identifier}>{choice(`${v.name} (${v.language})`, () => setDraft({ ...draft, voiceId:v.identifier }), draft.voiceId === v.identifier)}</View>)}
        {!voices.some(v => voiceMatches(v.language, draft.language)) && <Text style={styles.text}>{ui.noVoice}</Text>}
        {draft.language === 'darija' && !voices.some(v => v.language.toLowerCase().replace('_','-') === 'ar-ma') && <Text style={styles.text}>{ui.voiceFallback}</Text>}
        {choice(labels.test, () => { setBusy(true); void speech.initialize(draft).then(status => {
          if (status === 'missing') setError(ui.noVoice);
          else { return speech.say({darija:'يالله على بركة الله! كمّل نيشان ومن بعد دور على ليمن.',fr:'En route. Continuez tout droit, puis tournez à droite.',en:'Let’s go. Continue straight, then turn right.'}[draft.language], true, true); }
        }).finally(() => setBusy(false)); })}
        {choice(`${labels.humor}: ${draft.humor ? labels.on : labels.off}`, () => setDraft({ ...draft, humor: !draft.humor }), draft.humor)}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {choice(labels.save, () => void save())}{choice(ui.cancel, close)}
      </ScrollView></SafeAreaView></View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({button:{padding:12,borderRadius:12,backgroundColor:'#EDF3EE'},selected:{borderWidth:2,borderColor:'#087F72'},text:{color:'#173E35',textAlign:'center'},title:{fontSize:20,fontWeight:'700',color:'#173E35',textAlign:'center'},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#102E3977'},sheet:{maxHeight:'85%',backgroundColor:'#FFFEF9',borderTopLeftRadius:24,borderTopRightRadius:24},content:{padding:20,gap:10},error:{color:'#A44C22'}});
