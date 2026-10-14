import {
  forexSessions as staticSessions,
  instrumentCategories as staticCategories,
} from './data.js';

// Map DB rows (Prisma shape) back to the front-end shape used by ui.js / timeline.js.
const mapInstrument = (inst) => ({
  name: inst.name,
  openDay: inst.openDay,
  closeDay: inst.closeDay,
  openHour: inst.openHour,
  closeHour: inst.closeHour,
  openTz: inst.openTz,
  optimalStartHour: inst.optimalStartHour,
  optimalEndHour: inst.optimalEndHour,
  optimalTz: inst.optimalTz,
  is24_7: inst.is247,
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
      instrumentCategories: staticCategories,
      forexSessions: staticSessions,
      source: 'static',
    };
  }
};
