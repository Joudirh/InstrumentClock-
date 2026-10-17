import "dotenv/config";
import { prisma } from "../lib/prisma";
import { forexSessions, instrumentCategories, seasons } from "../js/data.js";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  // Simplest idempotent strategy for a small reference dataset.
  await prisma.instrument.deleteMany();
  await prisma.category.deleteMany();
  await prisma.forexSession.deleteMany();
  await prisma.season.deleteMany();

  await prisma.season.createMany({
    data: [
      { key: "winter", label: "Hiver (Oct - Mar)", reference: new Date(seasons.winter) },
      { key: "summer", label: "Été (Mar - Oct)", reference: new Date(seasons.summer) },
    ],
  });

  await prisma.forexSession.createMany({
    data: forexSessions.map((session, index) => ({
      slug: session.id,
      name: session.name,
      flag: session.flag,
      startHour: session.startHour,
      endHour: session.endHour,
      timezone: session.timezone,
      color: session.color,
      yOffset: session.yOffset,
      position: index,
    })),
  });

  let categoryPosition = 0;
  for (const category of instrumentCategories) {
    await prisma.category.create({
      data: {
        slug: category.id,
        name: category.name,
        position: categoryPosition++,
        instruments: {
          create: category.items.map((item) => ({
            name: item.name,
            slug: slugify(item.name),
            openDay: item.openDay,
            closeDay: item.closeDay,
            openHour: item.openHour,
            closeHour: item.closeHour,
            openTz: item.openTz,
            optimalStartHour: item.optimalStartHour,
            optimalEndHour: item.optimalEndHour,
            optimalTz: item.optimalTz,
            is247: item.is24_7 ?? false,
            scheduleSegments: item.scheduleSegments ?? undefined,
            optimalSegments: item.optimalSegments ?? undefined,
          })),
        },
      },
    });
  }

  const [seasonsCount, sessionsCount, categoriesCount, instrumentsCount] =
    await Promise.all([
      prisma.season.count(),
      prisma.forexSession.count(),
      prisma.category.count(),
      prisma.instrument.count(),
    ]);

  console.log(
    `Seed done: ${seasonsCount} seasons, ${sessionsCount} sessions, ` +
      `${categoriesCount} categories, ${instrumentsCount} instruments.`,
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
