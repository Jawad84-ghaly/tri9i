import type { AlertKind, Maneuver, RouteMode } from '../types/navigation';

// Arabic script gives Arabic system voices a better chance than Latin Darija.
export const darijaAudioPrompts = {
  police: ['كاينة مراقبة قدّامك. سوق بالمعقول، اللي زربو ماتو!'],
  radar: ['ردّ بالك، رادار قدّامك. الطريق ماشي طاجين باش تزيد ليه العافية!'],
  construction: ['كاينين الشغال قدّامك. بشوية، الصبر مفتاح الفرج.'],
  accident: ['كاينة حادثة قدّامك. نقص السرعة وخلّي مسافة الأمان.'],
  traffic: ['كاينة الزحمة. الصبر زين، والطريق ما غاديش يطير!'],
  rerouting: ['خرجنا على الطريق. ما فيها باس، حتى الكسكس كيتقلّب! غادي نقلب على طريق آخر.'],
  arrived: ['وصلنا على خير! اللي بغا أتاي، يركن اللّول.'],
  start: ['يالله على بركة الله! بشوية عليك، اللي زربو ماتو.'],
} as const;
export type PromptEvent = keyof typeof darijaAudioPrompts;
export function eventPrompt(event: PromptEvent): string { return darijaAudioPrompts[event][0]; }

export const modeLabels: Record<RouteMode, string> = {
  fastest: 'اللّي توصل بك بكري', economical: 'اللّي توفّر ليك', shortest: 'اللّي فيها كيلومترات قلّ',
};
export const alertLabels: Record<AlertKind, string> = {
  police: 'مراقبة', radar: 'رادار', construction: 'شغال', accident: 'حادثة', traffic: 'زحمة',
};
export const alertIcons: Record<AlertKind, string> = {
  police: '👮', radar: '📷', construction: '🚧', accident: '⚠️', traffic: '🚗',
};
export const ui = {
  brand: 'طريقي', subtitle: 'سوق بالمعقول، وصل على خير', search: 'فين باغي تمشي؟', find: 'قلّب',
  demo: 'غير تجربة • الطريق والتنبيهات ماشي حقيقيين', live: 'الطريق دابا',
  locating: 'كنقلبو على البلاصة ديالك…', noGps: 'ما لقيناش البلاصة ديالك. شعل تحديد الموقع وسمح لينا نستعملوه.',
  retryGps: 'عاود قلّب على بلاصتي', gpsWeak: 'الموقع ما دقيقش دابا، تسنّى شوية.',
  network: 'ما قدرناش نتّاصلو. شوف الكونكسيون وعاود جرّب.', config: 'خاص إعدادات الخدمة يتكمّلو باش نخدمو.',
  noResults: 'ما لقينا والو. جرّب سميّة أخرى.', calculating: 'كنقلبو ليك على الطريق…',
  choose: 'اختار الطريق اللي تواتيك', start: 'يالله نمشيو', stop: 'حبس التوجيه',
  report: 'بلّغ على الطريق', sent: 'وصل البلاغ ديالك، الله يحفظك!', localSent: 'تسجّل غير فهاد التجربة.',
  reportFailed: 'ما وصلش البلاغ. عاود جرّب ملي ترجع الكونكسيون.', reporting: 'كنصيفطو البلاغ…',
  reportUnavailable: 'التبليغ ما خدامش دابا.', parked: 'بلّغ غير إلا كنت واقف ولا راكب حدّا السائق.',
  cancel: 'رجع', close: 'واخّا', follow: 'ورّيني بلاصتي', mute: 'سكّت الصوت', unmute: 'شعل الصوت',
  noVoice: 'ما لقيناش صوت بالعربية. التوجيه بالكتابة خدام.', voiceFallback: 'الصوت بالعربية، النطق بالدارجة يقدر ما يكونش مضبوط.',
  shortestNote: 'أقصر وحدة بين الطرق اللي لقينا، ماشي ضمان لأقصر طريق فكلشي.',
  economyNote: 'الأولوية بلا بيّاج، ومن بعد الصرف المقدّر.',
  tollsPossible: 'طلبنا نتفاداو البيّاج ولكن يقدر يبقى. الثمن ما معروفش، والأرخص ما مضمونش.',
  tollFree: 'بلا بيّاج حسب معطيات الطريق',
  same: 'نفس الطريق ديال', unavailable: 'ما لقيناش طريق بهاد الشرط',
  noTraffic: 'الزحمة المباشرة ما مؤكّداش هنا', traffic: 'وقت محسوب بمعطيات الزحمة المتوفّرة',
  alertsOffline: 'تنبيهات الناس ما تحدّثوش دابا', alertsDisabled: 'تنبيهات الناس ما مربوطاش',
  alertsLive: 'تنبيهات الناس كتتحدّث', stale: 'التحديث ما وصلش، باقين على آخر طريق',
  refreshed: 'آخر حساب', minutes: 'د', km: 'كلم', liters: 'لتر تقريباً',
  mapHint: 'ضغط مطوّل على الخريطة باش تختار فين تمشي', pin: 'البلاصة اللي اخترتي',
  chooseDemo: 'جرّب الطريق فـ كازا', mapbox: 'المسار والبحث من Mapbox • © OpenStreetMap',
  sourceCommunity: 'بلاغ من الناس، باقي ما متأكّدش', sourceMapbox: 'تنبيه من خدمة الطريق',
  sourceWaze: 'تنبيه من الشريك', sourceDemo: 'تنبيه ديال التجربة',
  background: 'التوجيه كيخدم غير ملي التطبيق محلول قدّامك.',
} as const;

export function maneuverPrompt(step: Maneuver, meters?: number): string {
  const prefix = meters !== undefined && meters > 35 ? `من بعد ${Math.round(meters / 10) * 10} متر، ` : '';
  if (step.type === 'arrive') return prefix + 'غادي توصل للبلاصة اللي بغيتي.';
  if (step.type.includes('roundabout') || step.type === 'rotary') {
    return prefix + (step.exit ? `دخل للرومبوان وخرج من الخرجة رقم ${step.exit}.` : 'دخل للرومبوان وتبع الطريق المبيّنة.');
  }
  if (step.modifier === 'uturn') return prefix + 'دور ورجع غير من البلاصة المسموح بها.';
  if (step.modifier?.includes('left')) return prefix + (step.type === 'fork' ? 'شدّ ليسر فالتفرّع.' : 'دور على ليسر.');
  if (step.modifier?.includes('right')) return prefix + (step.type === 'fork' ? 'شدّ ليمن فالتفرّع.' : 'دور على ليمن.');
  if (step.type === 'merge') return prefix + 'دخل للطريق بشوية وخلّي مسافة الأمان.';
  if (step.type.includes('ramp')) return prefix + 'شدّ الخرجة المبيّنة فالخريطة.';
  return prefix + 'كمّل نيشان مع الطريق.';
}
