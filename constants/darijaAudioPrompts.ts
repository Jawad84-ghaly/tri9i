import type { AlertKind, Maneuver, RouteMode } from '../types/navigation';
import { getLanguage, localized } from './language';
import { frUi, enUi } from './translations';

// Arabic script gives Arabic system voices a better chance than Latin Darija.
export const darijaAudioPrompts = {
  police: ['كاينة مراقبة قدّامك. سوق بالمعقول، اللي زربو ماتو!', 'كاينة مراقبة. دير حزامك وخلي البسمة فوجّهك.'],
  radar: ['ردّ بالك، رادار قدّامك. الطريق ماشي طاجين باش تزيد ليه العافية!', 'رادار قدّامك. هادي ماشي تصويرة ديال العرس، بشوية عليك!'],
  construction: ['كاينين الشغال قدّامك. بشوية، الصبر مفتاح الفرج.'],
  accident: ['كاينة حادثة قدّامك. نقص السرعة وخلّي مسافة الأمان.'],
  traffic: ['كاينة الزحمة. الصبر زين، والطريق ما غاديش يطير!', 'الزحمة قدّامك. راه حتى أتاي خاصّو الوقت باش يطلق!', 'الطريق عامرة. خلي الكلاكسون يرتاح، ماشي هو اللي غادي يحلّها!'],
  rerouting: ['غادي نعاود نحسب الطريق. ما فيها باس، حتى الكسكس كيتقلّب!', 'نقلّبو على طريق آخر. اللي تلف يشدّ الأرض، وحنا نشدّو الخريطة!'],
  arrived: ['وصلنا على خير! اللي بغا أتاي، يركن اللّول.', 'ها حنا وصلنا! ركن مزيان، وخلّي البلاصة لولد الناس.'],
  start: ['يالله على بركة الله! بشوية عليك، اللي زربو ماتو.', 'بسم الله، شدّ حزامك. الطريق ماشي سباق ديال البغال!'],
} as const;
export type PromptEvent = keyof typeof darijaAudioPrompts;
const plain = { police:'كاينة مراقبة قدّامك. تبع قوانين الطريق.', radar:'كاين رادار قدّامك. احترم السرعة المسموح بها.', construction:'كاينين الشغال قدّامك. نقص السرعة.', accident:'كاينة حادثة قدّامك. خلي مسافة الأمان.', traffic:'كاينة الزحمة قدّامك.', rerouting:'كنعاودو نحسبو الطريق.', arrived:'وصلتي للبلاصة اللي بغيتي.', start:'يالله نبداو الطريق.' };
const events = {
  fr: { police:'Contrôle devant vous. Respectez le code de la route.', radar:'Radar devant vous. Respectez la limitation de vitesse.', construction:'Travaux devant vous. Ralentissez.', accident:'Accident devant vous. Gardez vos distances.', traffic:'Embouteillage devant vous.', rerouting:'Recalcul du trajet.', arrived:'Vous êtes arrivé. Garez-vous avant de prendre le thé !', start:'En route. Attachez votre ceinture.' },
  en: { police:'Police check ahead. Follow road rules.', radar:'Speed camera ahead. Follow the speed limit.', construction:'Road works ahead. Slow down.', accident:'Accident ahead. Keep a safe distance.', traffic:'Traffic jam ahead.', rerouting:'Recalculating route.', arrived:'You have arrived. Park before having tea!', start:'Let’s go. Fasten your seat belt.' },
};
export function eventPrompt(event: PromptEvent, humor = true, variant = 0): string {
  const language = getLanguage();
  if (language !== 'darija') return !humor && event === 'arrived' ? (language === 'fr' ? 'Vous êtes arrivé.' : 'You have arrived.') : events[language][event];
  const phrases = darijaAudioPrompts[event];
  return humor ? phrases[Math.abs(variant) % phrases.length]! : plain[event];
}

export const modeLabels: Record<RouteMode, string> = localized({
  fastest: 'اللّي توصل بك بكري', economical: 'اللّي توفّر ليك', shortest: 'اللّي فيها كيلومترات قلّ',
}, {fastest:'Le plus rapide',economical:'Économique',shortest:'Le plus court'}, {fastest:'Fastest',economical:'Economical',shortest:'Shortest'});
export const alertLabels: Record<AlertKind, string> = localized({
  police: 'مراقبة', radar: 'رادار', construction: 'شغال', accident: 'حادثة', traffic: 'زحمة',
}, {police:'Contrôle',radar:'Radar',construction:'Travaux',accident:'Accident',traffic:'Embouteillage'}, {police:'Police',radar:'Camera',construction:'Works',accident:'Accident',traffic:'Traffic jam'});
export const alertIcons: Record<AlertKind, string> = {
  police: '👮', radar: '📷', construction: '🚧', accident: '⚠️', traffic: '🚗',
};
export const darijaUi = {
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
  noVoice: 'ما لقيناش صوت بهاد اللغة. التوجيه بالكتابة خدام.', voiceFallback: 'الصوت بالعربية، النطق بالدارجة يقدر ما يكونش مضبوط.',
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
export const ui = localized(darijaUi, frUi, enUi);

export function maneuverPrompt(step: Maneuver, meters?: number): string {
  const lang = getLanguage();
  if (lang !== 'darija') {
    const fr = lang === 'fr', n = Math.round((meters ?? 0) / 10) * 10;
    const prefix = meters !== undefined && meters > 35 ? (fr ? `Dans ${n} mètres, ` : `In ${n} meters, `) : '';
    let instruction = fr ? 'continuez tout droit.' : 'continue straight.';
    if (step.type === 'arrive') instruction = fr ? 'vous arriverez à destination.' : 'you will reach your destination.';
    else if (step.type.includes('roundabout') || step.type === 'rotary') instruction = step.exit ? (fr ? `prenez la sortie ${step.exit} au rond-point.` : `take exit ${step.exit} at the roundabout.`) : (fr ? 'suivez le rond-point indiqué.' : 'follow the roundabout shown.');
    else if (step.modifier === 'uturn') instruction = fr ? 'faites demi-tour là où cela est autorisé.' : 'make a U-turn where permitted.';
    else if (step.modifier?.includes('left')) instruction = step.type === 'fork' ? (fr ? 'restez à gauche.' : 'keep left.') : (fr ? 'tournez à gauche.' : 'turn left.');
    else if (step.modifier?.includes('right')) instruction = step.type === 'fork' ? (fr ? 'restez à droite.' : 'keep right.') : (fr ? 'tournez à droite.' : 'turn right.');
    else if (step.type === 'merge') instruction = fr ? 'insérez-vous prudemment.' : 'merge carefully.';
    else if (step.type.includes('ramp')) instruction = fr ? 'prenez la bretelle indiquée.' : 'take the ramp shown.';
    return prefix + instruction;
  }
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
