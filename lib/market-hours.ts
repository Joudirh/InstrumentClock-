// Lecture normalisée des plages horaires d'un instrument (relation InstrumentWindow),
// indépendante de Luxon : conversions via Intl.DateTimeFormat, DST géré par la locale IANA.

export type WindowKind = "TRADING" | "OPTIMAL";

export interface MarketWindow {
  kind: WindowKind;
  /** Jours de DÉBUT de plage : 1 = lundi … 7 = dimanche. */
  days: number[];
  /** 0–1439. */
  startMinute: number;
  /** > startMinute ; 1440 = minuit ; > 1440 = passe minuit (ex. 2460 = 17:00 J+1). */
  endMinute: number;
  timezone: string;
  label?: string | null;
  position?: number;
}

export interface InstrumentWithWindows {
  id?: number;
  name?: string;
  windows: MarketWindow[];
}

const MINUTES_PER_DAY = 1440;
const MAX_END = MINUTES_PER_DAY * 2;

/**
 * 1440 -> "24:00" ou "00:00" (paramètre ; défaut "24:00"), > 1440 -> modulo 1440.
 */
export function minutesToHHMM(minute: number, midnightAs24 = true): string {
  if (minute < 0 || minute > MAX_END) {
    throw new Error(`minute hors bornes: ${minute}`);
  }
  const m = minute >= MINUTES_PER_DAY ? minute % MINUTES_PER_DAY : minute;
  if (m === 0 && midnightAs24) return "24:00";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Parties UTC-offset-composées de `date` dans le fuseau IANA donné. */
function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const weekdays = { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = weekdays[parts.weekday as keyof typeof weekdays];
  const hour = Number(parts.hour ?? "0");
  const minute = Number(parts.minute ?? "0");
  return { day, minuteOfDay: hour * 60 + minute };
}

const previousDay = (day: number): number => ((day - 2 + 7) % 7) + 1;

/**
 * Vrai si l'instant appartient à la plage. Gère le passage de minuit
 * (la fin peut tomber le jour suivant) et l'heure d'été/hiver via `timezone`.
 */
export function isWithinWindow(window: MarketWindow, date: Date): boolean {
  if (window.startMinute < 0 || window.startMinute >= MINUTES_PER_DAY) return false;
  if (window.endMinute <= window.startMinute || window.endMinute > MAX_END) return false;
  if (!window.days || window.days.length === 0) return false;

  const { day, minuteOfDay } = partsInZone(date, window.timezone);

  // Séquence contenue dans la même journée calendaire (endMinute <= 1440).
  if (window.endMinute <= MINUTES_PER_DAY) {
    return window.days.includes(day) && minuteOfDay >= window.startMinute && minuteOfDay < window.endMinute;
  }
  // Passe minuit : fin le jour suivant (endMinute > 1440).
  const endLocal = window.endMinute - MINUTES_PER_DAY;
  if (window.days.includes(day) && minuteOfDay >= window.startMinute) return true;
  return window.days.includes(previousDay(day)) && minuteOfDay < endLocal;
}

const firstWindowOpen = (instrument: InstrumentWithWindows, kind: WindowKind, date: Date): boolean =>
  instrument.windows.some((w) => w.kind === kind && isWithinWindow(w, date));

export function isMarketOpen(instrument: InstrumentWithWindows, date: Date): boolean {
  return firstWindowOpen(instrument, "TRADING", date);
}

export function isOptimalNow(instrument: InstrumentWithWindows, date: Date): boolean {
  return firstWindowOpen(instrument, "OPTIMAL", date);
}

/** Plages regroupées par kind, ordonnées, au format "HH:MM–HH:MM (fuseau)". */
export function groupWindows(instrument: InstrumentWithWindows): Array<{ kind: WindowKind; entries: string[] }> {
  const kinds: WindowKind[] = ["TRADING", "OPTIMAL"];
  return kinds.map((kind) => ({
    kind,
    entries: instrument.windows
      .filter((w) => w.kind === kind)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.startMinute - b.startMinute)
      .map(
        (w) =>
          `${w.label ? w.label + " " : ""}${minutesToHHMM(w.startMinute, false)}–${minutesToHHMM(
            w.endMinute,
            true,
          )} (${w.timezone})`,
      ),
  }));
}
