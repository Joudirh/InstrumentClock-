import type { WindowKind } from "./generated/prisma/enums";

export type WindowInput = {
  kind: WindowKind;
  days: number[];
  startMinute: number;
  endMinute: number;
  timezone: string;
  label: string | null;
};

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug unique : ajoute -2, -3... si le slug de base existe déjà. */
export async function uniqueSlug(
  base: string,
  taken: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base) || "sans-nom";
  let candidate = root;
  let i = 2;
  while (await taken(candidate)) {
    candidate = `${root}-${i++}`;
  }
  return candidate;
}

/** Heures décimales legacy : fin à minuit -> 24, passage minuit -> modulo 24. */
function decimalCloseHour(endMinute: number): number {
  if (endMinute === 1440) return 24;
  return (endMinute % 1440) / 60;
}

/**
 * Colonnes legacy (open/close/optimal) dérivées des plages normalisées.
 * Le front continue de lire ces colonnes, donc elles sont recalculées
 * à chaque écriture pour rester cohérentes avec `instrument_windows`.
 */
export function deriveLegacyColumns(
  windows: WindowInput[],
  is247: boolean
): {
  openDay: number;
  closeDay: number;
  openHour: number;
  closeHour: number;
  openTz: string;
  optimalStartHour: number;
  optimalEndHour: number;
  optimalTz: string;
  is247: boolean;
} {
  const trading = windows
    .filter((w) => w.kind === "TRADING")
    .sort((a, b) => a.startMinute - b.startMinute);
  const optimal = windows
    .filter((w) => w.kind === "OPTIMAL")
    .sort((a, b) => a.startMinute - b.startMinute);
  const unionDays = [...new Set(trading.flatMap((w) => w.days))].sort((a, b) => a - b);
  const first = trading[0];
  const last = trading[trading.length - 1];
  const optFirst = optimal[0];
  const optLast = optimal[optimal.length - 1];
  return {
    openDay: unionDays[0] ?? 1,
    closeDay: unionDays[unionDays.length - 1] ?? 5,
    openHour: (first?.startMinute ?? 0) / 60,
    closeHour: last ? decimalCloseHour(last.endMinute) : 24,
    openTz: first?.timezone ?? "UTC",
    optimalStartHour: (optFirst?.startMinute ?? (first?.startMinute ?? 0)) / 60,
    optimalEndHour: optLast ? decimalCloseHour(optLast.endMinute) : 24,
    optimalTz: optFirst?.timezone ?? first?.timezone ?? "UTC",
    is247,
  };
}

/** Valide les plages d'un instrument ; renvoie une liste d'erreurs (vide si OK). */
export function validateWindows(
  raw: unknown,
  timezones: Set<string>
): { ok: true; windows: WindowInput[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null || !Array.isArray(raw)) {
    return { ok: false, errors: ["windows: tableau attendu"] };
  }
  const arr = raw as Record<string, unknown>[];
  if (arr.length > 12) errors.push("windows: 12 plages maximum");

  const parsed: WindowInput[] = [];
  arr.forEach((w, i) => {
    const label = `plage ${i + 1}`;
    const kind = w.kind;
    if (kind !== "TRADING" && kind !== "OPTIMAL") {
      errors.push(`${label}: type de plage invalide (TRADING ou OPTIMAL)`);
      return;
    }
    const startMinute = Number(w.startMinute);
    const endMinute = Number(w.endMinute);
    if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute >= 1440) {
      errors.push(`${label}: heure de début invalide`);
      return;
    }
    if (!Number.isInteger(endMinute) || endMinute <= startMinute || endMinute > 2880) {
      errors.push(`${label}: heure de fin invalide (doit être après le début, au-delà de minuit possible)`);
      return;
    }
    const days = Array.isArray(w.days) ? w.days : [];
    const dayInts = days.map(Number);
    if (dayInts.length === 0 || dayInts.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
      errors.push(`${label}: jours invalides (1=lundi ... 7=dimanche)`);
      return;
    }
    const timezone = typeof w.timezone === "string" ? w.timezone : "";
    if (!timezone || (!timezones.has(timezone) && timezone !== "UTC")) {
      errors.push(`${label}: fuseau horaire inconnu ${timezone}`);
      return;
    }
    const text = w.label;
    parsed.push({
      kind,
      days: [...new Set(dayInts)].sort((a, b) => a - b),
      startMinute,
      endMinute,
      timezone,
      label: typeof text === "string" && text.trim() ? text.trim() : null,
    });
  });

  if (!parsed.some((w) => w.kind === "TRADING")) {
    errors.push("Chaque instrument doit avoir au moins une plage TRADING");
  }
  if (!parsed.some((w) => w.kind === "OPTIMAL")) {
    errors.push("Chaque instrument doit avoir au moins une plage OPTIMAL");
  }
  return errors.length ? { ok: false, errors } : { ok: true, windows: parsed };
}

/** Fuseaux horaires supportés par l'environnement courant (Intl). */
export function supportedTimezones(): Set<string> {
  try {
    return new Set(Intl.supportedValuesOf("timeZone") as string[]);
  } catch {
    return new Set(["UTC"]);
  }
}
