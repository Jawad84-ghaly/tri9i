export type Language = 'darija' | 'fr' | 'en';
export const languages: Record<Language, string> = { darija: 'الدارجة المغربية', fr: 'Français', en: 'English' };
let active: Language = 'darija';
export const getLanguage = () => active;
export function setLanguage(language: Language) { active = language; }
// Screens re-render after a persisted preference change; services read the same locale.
export function localized<T extends Record<string, string>>(darija: T,
  fr: Record<keyof T, string>, en: Record<keyof T, string>): Record<keyof T, string> {
  return new Proxy(darija, { get: (target, key: string) =>
    (active === 'fr' ? fr : active === 'en' ? en : target)[key as keyof T] });
}
