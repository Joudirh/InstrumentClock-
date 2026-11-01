import {
  forexSessions as staticSessions,
  instrumentCategories as staticCategories,
} from './data.js';

// Map DB rows (Prisma shape) back to the front-end shape used by ui.js / timeline.js.
const mapInstrument = (inst) => ({
  id: inst.id,
  name: inst.name,
  description: inst.description || "",
  openDay: inst.openDay,
  closeDay: inst.closeDay,
  openHour: inst.openHour,
  closeHour: inst.closeHour,
  openTz: inst.openTz,
  optimalStartHour: inst.optimalStartHour,
  optimalEndHour: inst.optimalEndHour,
  optimalTz: inst.optimalTz,
  is24_7: inst.is247,
  scheduleSegments: inst.scheduleSegments,
  optimalSegments: inst.optimalSegments,
  // Session rattachée et plages horaires normalisées (instrument_windows).
  // Comportement visible inchangé : le front continue de lire les colonnes legacy ci-dessus.
  session: inst.session
    ? {
        slug: inst.session.slug,
        name: inst.session.name,
        region: inst.session.region,
        timezone: inst.session.timezone,
        is24_7: inst.session.is247,
      }
    : null,
  windows: (inst.windows || []).map((w) => ({
    kind: w.kind,
    days: w.days,
    startMinute: w.startMinute,
    endMinute: w.endMinute,
    timezone: w.timezone,
    label: w.label,
    position: w.position,
  })),
});

const mapCategory = (category) => ({
  id: category.slug,
  name: category.name,
  items: (category.instruments || []).map(mapInstrument),
});

const mapSession = (session) => ({
  id: session.slug,
  name: session.name,
  flag: session.flag,
  startHour: session.startHour,
  endHour: session.endHour,
  timezone: session.timezone,
  color: session.color,
  yOffset: session.yOffset,
});

// Fallback statique : dérive des plages normalisées depuis les colonnes legacy de
// js/data.js, pour que le front consomme partout la même shape (windows/kind/minutes).
const legacyToWindows = (item) => {
  const windows = [];
  const days = [];
  if (item.is24_7) {
    for (let d = 1; d <= 7; d++) days.push(d);
  } else if (item.openDay && item.closeDay) {
    for (let d = Math.min(item.openDay, item.closeDay); d <= Math.max(item.openDay, item.closeDay); d++) days.push(d);
  } else {
    for (let d = 1; d <= 5; d++) days.push(d);
  }
  const startMinute = Math.round((item.openHour ?? 0) * 60);
  let endMinute = item.closeHour === 24 ? 1440 : Math.round((item.closeHour ?? 24) * 60);
  if (endMinute <= startMinute) endMinute += 1440;
  windows.push({
    kind: 'TRADING',
    days,
    startMinute,
    endMinute,
    timezone: item.openTz,
    label: null,
    position: 0,
  });
  if (item.optimalStartHour !== undefined && item.optimalEndHour !== undefined) {
    const optStart = Math.round(item.optimalStartHour * 60);
    let optEnd = item.optimalEndHour === 24 ? 1440 : Math.round(item.optimalEndHour * 60);
    if (optEnd <= optStart) optEnd += 1440;
    windows.push({
      kind: 'OPTIMAL',
      days: days,
      startMinute: optStart,
      endMinute: optEnd,
      timezone: item.optimalTz || item.openTz,
      label: null,
      position: 0,
    });
  }
  return windows;
};

export const fetchAppData = async () => {
  try {
    const [instrumentsRes, sessionsRes] = await Promise.all([
      fetch('/api/instruments'),
      fetch('/api/sessions'),
    ]);

    if (!instrumentsRes.ok || !sessionsRes.ok) {
      throw new Error(`API error (${instrumentsRes.status}/${sessionsRes.status})`);
    }

    const { categories } = await instrumentsRes.json();
    const { sessions } = await sessionsRes.json();

    return {
      instrumentCategories: categories.map(mapCategory),
      forexSessions: sessions.map(mapSession),
      source: 'api',
    };
  } catch (error) {
    console.warn('API indisponible, utilisation des données statiques (js/data.js).', error);
    return {
      instrumentCategories: staticCategories.map((category) => ({
        ...category,
        items: category.items.map((item) => ({
          ...item,
          windows: legacyToWindows(item),
          session: null,
        })),
      })),
      forexSessions: staticSessions,
      source: 'static',
    };
  }
};
