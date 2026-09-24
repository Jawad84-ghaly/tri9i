import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { favoriteKinds, loadFavorites, upsertFavorite, writeFavorites } from '../services/favoritesService';
import type { FavoriteKind, FavoritePlace } from '../services/favoritesService';
import type { Destination } from '../types/navigation';

const labels: Record<FavoriteKind, string> = { home: '🏠 الدار', work: '💼 الخدمة', school: '🎒 المدرسة', gym: '🏋️ لا صال', other: '⭐ بلاصة أخرى' };
type Props = { target: Destination | null; disabled: boolean; onChoose: (place: Destination) => void };
export function FavoritePlaces({ target, disabled, onChoose }: Props) {
  const [places, setPlaces] = useState<FavoritePlace[]>([]);
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FavoriteKind>('home'), [name, setName] = useState('');
  async function reload() {
    try { setPlaces(await loadFavorites()); setLoaded(true); setError(''); }
    catch { setError('ما قدرناش نقراو البلايص المحفوظين. ضغط هنا نعاودو.'); }
  }
  useEffect(() => { void reload(); }, []);
  async function persist(next: FavoritePlace[]) {
    setBusy(true); setError('');
    try { await writeFavorites(next); setPlaces(next); setOpen(false); }
    catch { setError('ما تسجلاتش التغييرات. عاود جرّب.'); }
    finally { setBusy(false); }
  }
  function save() {
    if (!target || busy || !loaded || !name.trim()) return;
    const next = upsertFavorite(places, target, kind, name.trim());
    const existing = kind !== 'other' && places.find(p => p.kind === kind);
    if (existing) Alert.alert('نبدّلو هاد البلاصة؟', existing.name, [
      { text: 'لا', style: 'cancel' }, { text: 'بدّل', onPress: () => void persist(next) },
    ]);
    else void persist(next);
  }
  return <View style={styles.group}>
    <Text style={styles.heading}>البلايص ديالي</Text>
    {!!error && <Pressable onPress={() => void reload()}><Text style={styles.error}>{error}</Text></Pressable>}
    <ScrollView horizontal contentContainerStyle={styles.row}>
      {places.map(place => <View key={place.id} style={styles.place}>
        <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={() => onChoose(place)}>
          <Text style={styles.text}>{labels[place.kind]} · {place.name}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`مسح ${place.name}`} disabled={busy} onPress={() => {
          Alert.alert('نمسحو هاد البلاصة؟', place.name, [{ text: 'لا', style: 'cancel' },
            { text: 'مسح', style: 'destructive', onPress: () => void persist(places.filter(p => p.id !== place.id)) }]);
        }}><Text style={styles.remove}>مسح</Text></Pressable>
      </View>)}
    </ScrollView>
    {!places.length && <Text style={styles.note}>اختار بلاصة بالبحث ولا ضغط مطوّل على الخريطة، ومن بعد سجّلها.</Text>}
    <Pressable accessibilityRole="button" disabled={!target || !loaded || busy || places.length >= 50} style={styles.button}
      onPress={() => { setKind('home'); setName('الدار'); setOpen(true); }}>
      <Text style={styles.text}>{target ? '☆ سجّل هاد البلاصة' : 'اختار بلاصة باش تسجّلها'}</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => !busy && setOpen(false)}>
      <View style={styles.backdrop}><SafeAreaView style={styles.sheet}>
        <Text style={styles.heading}>شنو سميّة هاد البلاصة؟</Text>
        <View style={styles.categories}>{favoriteKinds.map(value => <Pressable key={value} accessibilityRole="radio"
          accessibilityState={{ selected: kind === value }} style={[styles.button, kind === value && styles.selected]}
          disabled={busy} onPress={() => { setKind(value); setName(value === 'other' ? '' : labels[value].split(' ').slice(1).join(' ')); }}>
          <Text style={styles.text}>{labels[value]}</Text>
        </Pressable>)}</View>
        <TextInput accessibilityLabel="سميّة البلاصة" value={name} onChangeText={setName} editable={!busy}
          maxLength={120} style={styles.input} placeholder="سميّة البلاصة" />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy || !name.trim()} style={styles.button} onPress={save}><Text style={styles.text}>{busy ? 'كنسجّلو…' : 'سجّل'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => setOpen(false)}><Text style={styles.text}>رجع</Text></Pressable>
      </SafeAreaView></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: 8 }, heading: { fontSize: 17, fontWeight: '700', color: '#173E35', textAlign: 'right' },
  row: { gap: 8 }, place: { borderWidth: 1, borderColor: '#D8E4DC', padding: 10, borderRadius: 12, gap: 8 },
  text: { color: '#173E35', textAlign: 'center' }, note: { color: '#63766E', textAlign: 'right', fontSize: 11 },
  remove: { color: '#A44C22', textAlign: 'center', padding: 6 }, error: { color: '#A44C22', textAlign: 'right' },
  button: { padding: 12, borderRadius: 12, backgroundColor: '#EDF3EE' }, selected: { borderWidth: 2, borderColor: '#087F72' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#102E3977' },
  sheet: { padding: 22, gap: 12, backgroundColor: '#FFFEF9', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  categories: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  input: { borderWidth: 1, borderColor: '#D8E4DC', borderRadius: 12, padding: 14, textAlign: 'right', color: '#173E35' },
});
