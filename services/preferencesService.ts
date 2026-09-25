import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
const schema = z.object({ language: z.enum(['darija','fr','en']), voiceId: z.string().max(500), humor: z.boolean() });
export type Preferences = z.infer<typeof schema>;
export const defaults: Preferences = { language:'darija', voiceId:'', humor:true };
const key = 'tri9i.preferences.v1';
export async function loadPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? schema.parse(JSON.parse(raw)) : { ...defaults };
}
export async function savePreferences(value: Preferences) {
  await AsyncStorage.setItem(key, JSON.stringify(schema.parse(value)));
}
