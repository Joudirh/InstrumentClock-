import "dotenv/config";
import { prisma } from "./lib/prisma";

// §4 : test d'insertion refusée — chaque écriture est annulée (ROLLBACK).
async function main() {
  // 1. days = NULL doit être refusé par instrument_windows_days_check
  let nullRejected = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO instrument_windows (instrument_id, kind, days, start_minute, end_minute, timezone, position)
         VALUES (72, 'TRADING', NULL, 480, 1020, 'Europe/London', 999)`,
      );
      throw new Error("INSERT NULL ACCEPTÉ — CHECK inopérant !");
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("CHECK inopérant")) throw e;
    nullRejected = msg.includes("instrument_windows_days_check") || msg.includes("violates");
  }
  console.log("days=NULL refusé :", nullRejected ? "OUI ✅" : "NON ❌");

  // 2. doublon (instrument, kind, position) doit être refusé par l'index unique
  let dupRejected = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO instrument_windows (instrument_id, kind, days, start_minute, end_minute, timezone, position)
         SELECT instrument_id, kind, days, start_minute, end_minute, timezone, position
         FROM instrument_windows WHERE instrument_id=72 AND kind='TRADING' AND position=0`,
      );
      throw new Error("DOUBLON ACCEPTÉ — index unique inopérant !");
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("index unique inopérant")) throw e;
    dupRejected = msg.includes("instrument_windows_instrument_id_kind_position_key") || msg.includes("duplicate");
  }
  console.log("doublon (instrument,kind,position) refusé :", dupRejected ? "OUI ✅" : "NON ❌");

  if (!nullRejected || !dupRejected) process.exit(1);

  await prisma.$disconnect();
}

main();
