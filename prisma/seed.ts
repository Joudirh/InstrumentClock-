import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import {
  CATEGORIES,
  INSTRUMENTS,
  SESSIONS,
  type InstrumentSeed,
  type WindowSeed,
} from "./seed-data";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function supportedTimezones(): Set<string> {
  try {
    return new Set(Intl.supportedValuesOf("timeZone"));
  } catch {
    const Probe = new Intl.DateTimeFormat("en-US", { timeZone: "UTC" });
    return new Set(["UTC"]);
  }
}

// Heures décimales legacy : fin à minuit -> 24, passage minuit -> modulo 24.
function decimalCloseHour(endMinute: number): number {
  if (endMinute === 1440) return 24;
  return (endMinute % 1440) / 60;
}

/** Colonnes legacy dérivées des plages (utilisées uniquement à la création d'un instrument). */
function legacyFromWindows(inst: InstrumentSeed, is247: boolean) {
  const trading = inst.windows.filter((w) => w.kind === "TRADING");
  const optimal = inst.windows.filter((w) => w.kind === "OPTIMAL");
  const unionDays = new Set(trading.flatMap((w) => w.days));
  return {
    openHour: trading[0].startMinute / 60,
    closeHour: decimalCloseHour(trading[trading.length - 1].endMinute),
    openDay: Math.min(...unionDays),
    closeDay: Math.max(...unionDays),
    openTz: trading[0].timezone,
    optimalTz: optimal[0].timezone,
    optimalStartHour: optimal[0].startMinute / 60,
    optimalEndHour: decimalCloseHour(optimal[optimal.length - 1].endMinute),
    is247,
  };
}

/** Validation des données avant écriture (échec = abort sans écriture). */
function validate(timezones: Set<string>) {
  const errors: string[] = [];
  const sessionSlugs = new Set(SESSIONS.map((s) => s.slug));
  for (const session of SESSIONS) {
    if (session.timezone !== "UTC" && !timezones.has(session.timezone)) {
      errors.push(`session ${session.slug}: fuseau invalide ${session.timezone}`);
    }
  }
  const ids = new Set<number>();
  for (const inst of INSTRUMENTS) {
    const where = `instrument ${inst.id} (${inst.name})`;
    if (ids.has(inst.id)) errors.push(`${where}: id dupliqué`);
    ids.add(inst.id);
    if (!sessionSlugs.has(inst.sessionSlug)) errors.push(`${where}: session inconnue ${inst.sessionSlug}`);
    const kinds = new Set(inst.windows.map((w) => w.kind));
    if (!kinds.has("TRADING")) errors.push(`${where}: pas de plage TRADING`);
    if (!kinds.has("OPTIMAL")) errors.push(`${where}: pas de plage OPTIMAL`);
    inst.windows.forEach((w, i) => {
      const label = `${where}: plage ${i}`;
      if (w.startMinute < 0 || w.startMinute >= 1440) errors.push(`${label}: startMinute ${w.startMinute}`);
      if (w.endMinute <= w.startMinute || w.endMinute > 2880) errors.push(`${label}: endMinute ${w.endMinute}`);
      if (w.days.length === 0 || w.days.some((d) => d < 1 || d > 7)) errors.push(`${label}: jours invalides`);
      if (w.timezone !== "UTC" && !timezones.has(w.timezone)) errors.push(`${label}: fuseau invalide ${w.timezone}`);
    });
  }
  if (errors.length > 0) {
    throw new Error(`Seed data invalide (${errors.length} erreurs):\n- ${errors.join("\n- ")}`);
  }
}

function validWindow(kind: WindowSeed["kind"], w: WindowSeed) {
  return {
    kind,
    days: w.days,
    startMinute: w.startMinute,
    endMinute: w.endMinute,
    timezone: w.timezone,
    label: w.label,
    position: w.position,
  };
}

async function main() {
  validate(supportedTimezones());

  // 1. Catégories : création uniquement si l'id est absent, jamais de renommage.
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }

  // 2. Sessions : upsert par slug.
  for (const session of SESSIONS) {
    await prisma.session.upsert({
      where: { slug: session.slug },
      update: {
        name: session.name,
        region: session.region,
        timezone: session.timezone,
        is247: session.is247,
        position: session.position,
      },
      create: session,
    });
  }

  const sessions = await prisma.session.findMany({ select: { id: true, slug: true, is247: true } });
  const sessionIdBySlug = new Map(sessions.map((s) => [s.slug, s.id]));
  const is247BySlug = new Map(sessions.map((s) => [s.slug, s.is247]));

  // 3. Instruments : upsert par id, puis remplissement des plages, le tout en une
  //    transaction par instrument (deleteMany + createMany = remplacement idempotent).
  for (const inst of INSTRUMENTS) {
    await prisma.$transaction(async (tx) => {
      const sessionId = sessionIdBySlug.get(inst.sessionSlug);
      if (!sessionId) {
        throw new Error(`Session absente: ${inst.sessionSlug} (instrument ${inst.id})`);
      }

      await tx.instrument.upsert({
        where: { id: inst.id },
        update: { sessionId, categoryId: inst.categoryId, description: inst.description },
        create: {
          id: inst.id,
          name: inst.name,
          description: inst.description,
          slug: slugify(inst.name),
          categoryId: inst.categoryId,
          sessionId,
          ...legacyFromWindows(inst, is247BySlug.get(inst.sessionSlug) === true),
        },
      });

      await tx.instrumentWindow.deleteMany({ where: { instrumentId: inst.id } });
      await tx.instrumentWindow.createMany({
        data: inst.windows.map((w) => ({ instrumentId: inst.id, ...validWindow(w.kind, w) })),
      });
    });
  }

  // 4. Réservé au compte d'administration : upsert (jamais de reset de mot de passe forcé).
  const ADMIN_EMAIL = "admin@instrumentclock.com";
  const ADMIN_PASSWORD = "admin123@";
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "Administrateur",
      role: "ADMIN",
      isActive: true,
      passwordHash: hashPassword(ADMIN_PASSWORD),
    },
  });

  // 5. Resynchronisation des séquences (rejouable : MAX=0 sur base vide -> valeur 1, is_called=false).
  for (const table of ["instruments", "categories", "sessions", "users"] as const) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`,
    );
  }

  const [sessionsCount, categoriesCount, instrumentsCount, windowsCount] = await Promise.all([
    prisma.session.count(),
    prisma.category.count(),
    prisma.instrument.count(),
    prisma.instrumentWindow.count(),
  ]);

  console.log(
    `Seed done: ${sessionsCount} sessions, ${categoriesCount} categories, ` +
      `${instrumentsCount} instruments, ${windowsCount} instrument_windows, admin ${ADMIN_EMAIL}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
