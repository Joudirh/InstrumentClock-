// Vérification de lib/market-hours.ts (aucun framework de test dans ce repo —
// lance `npx tsx scripts/market-hours-check.ts`).
import {
  groupWindows,
  isMarketOpen,
  isOptimalNow,
  isWithinWindow,
  minutesToHHMM,
  type InstrumentWithWindows,
} from "../lib/market-hours";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    failures++;
    console.error(`FAIL ${name}: attendu ${String(expected)}, obtenu ${String(actual)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

const inst: InstrumentWithWindows = {
  name: "test",
  windows: [
    // Londres 08:00-17:00 (cach Londres), futures CME 18:00-17:00+1 (dim→jeu),
    // Tokyo 09:00-11:30 + 12:30-15:30, crypto 24/7, NY 09:30-16:00 + optimal 10:30-16:00.
    { kind: "TRADING", days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 1020, timezone: "Europe/London" },
    {
      kind: "TRADING",
      days: [7, 1, 2, 3, 4],
      startMinute: 1080,
      endMinute: 2460,
      timezone: "America/New_York",
      label: "CME night",
    },
    { kind: "TRADING", days: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 690, timezone: "Asia/Tokyo" },
    { kind: "TRADING", days: [1, 2, 3, 4, 5], startMinute: 750, endMinute: 930, timezone: "Asia/Tokyo" },
    { kind: "TRADING", days: [1, 2, 3, 4, 5, 6, 7], startMinute: 0, endMinute: 1440, timezone: "UTC" },
    { kind: "OPTIMAL", days: [1, 2, 3, 4, 5], startMinute: 630, endMinute: 960, timezone: "America/New_York" },
  ],
};

const at = (iso: string) => new Date(iso);

// Londres — heure d'été : 5 oct 2026 BST (UTC+1) puis retour GMT le 25 oct. 07:59Z
check("Londres 5 oct 07:59Z (= 08:59 BST) ouvert", isWithinWindow(inst.windows[0], at("2026-10-05T07:59:00Z")), true);
// Même instant après changement d'heure (2 nov, UTC+0) : 07:59Z = 07:59 -> fermé
check("Londres 2 nov 07:59Z (= 07:59 GMT) fermé", isWithinWindow(inst.windows[0], at("2026-11-02T07:59:00Z")), false);
check("Londres 5 oct 07:01Z (= 08:01 BST) ouvert", isWithinWindow(inst.windows[0], at("2026-10-05T07:01:00Z")), true);

// New York — changement d'heure US le 1er nov 2026. 13:31Z = 09:31 EDT le 29 oct, 08:31 EST le 2 nov
const nyWindow = { kind: "TRADING" as const, days: [1, 2, 3, 4, 5], startMinute: 570, endMinute: 960, timezone: "America/New_York" };
check("NY 29 oct 13:31Z (= 09:31 EDT) ouvert", isWithinWindow(nyWindow, at("2026-10-29T13:31:00Z")), true);
check("NY 2 nov 13:31Z (= 08:31 EST) fermé", isWithinWindow(nyWindow, at("2026-11-02T13:31:00Z")), false);
check("NY 2 nov 14:31Z (= 09:31 EST) ouvert", isWithinWindow(nyWindow, at("2026-11-02T14:31:00Z")), true);

// Tokyo — pas d'heure d'été, pause déjeuner 11:30-12:30
check("Tokyo 03:30Z (12:30) frontière pause -> fermé", isWithinWindow(inst.windows[2], at("2026-06-03T02:45:00Z")), false);
check("Tokyo 02:15Z (11:15) ouvert", isWithinWindow(inst.windows[2], at("2026-06-03T02:15:00Z")), true);
check("Tokyo 04:01Z (13:01) ouvert (2e plage)", isWithinWindow(inst.windows[3], at("2026-06-03T04:01:00Z")), true);
check("Tokyo 06:31Z (15:31) fermé", isWithinWindow(inst.windows[3], at("2026-06-03T06:31:00Z")), false);

// Futures CME : 18:00 -> 17:00 le lendemain, dim (7) à jeu (4). Fin exclusive.
check("CME dim 1er nov 23:30Z (= dim 18:30 EST) ouvert", isWithinWindow(inst.windows[1], at("2026-11-01T23:30:00Z")), true);
check("CME lun 2 nov 17:00Z (= lun 12:00 EST, J+1) ouvert", isWithinWindow(inst.windows[1], at("2026-11-02T17:00:00Z")), true);
check("CME mar 3 nov 22:00Z (= mar 17:00 EST) fermé (fin exclusive)", isWithinWindow(inst.windows[1], at("2026-11-03T22:00:00Z")), false);
check("CME ven 6 nov 23:30Z (= ven 18:30 EST) fermé (pas de start vendredi)", isWithinWindow(inst.windows[1], at("2026-11-06T23:30:00Z")), false);

// Crypto 24/7
check("Crypto dimanche 12:00 UTC ouvert", isWithinWindow(inst.windows[4], at("2026-11-01T12:00:00Z")), true);

// Optimal
check("NY optimal (10:30-16:00) 2 nov 15:30Z (= 10:30 EST) ouvert", isOptimalNow({ name: "x", windows: [inst.windows[5]] }, at("2026-11-02T15:30:00Z")), true);
check("Optimal fermé le samedi 7 nov", isOptimalNow({ name: "x", windows: [inst.windows[5]] }, at("2026-11-07T15:30:00Z")), false);

// minutesToHHMM
check("minutesToHHMM(570)", minutesToHHMM(570), "09:30");
check("minutesToHHMM(1440) -> 24:00", minutesToHHMM(1440), "24:00");
check("minutesToHHMM(1440,false) -> 00:00", minutesToHHMM(1440, false), "00:00");
check("minutesToHHMM(2460) -> 17:00", minutesToHHMM(2460), "17:00");

const grouped = groupWindows(inst);
check("groupWindows CME affichage (dernière plage TRADING par startMinute)", grouped[0].entries[4], "CME night 18:00\u201317:00 (America/New_York)");

// Marché ouvert / fermé à un instant donné (COMMI dim = crypto 24/7)
check("isMarketOpen dimanche (crypto) vrai", isMarketOpen({ name: "x", windows: inst.windows }, at("2026-11-01T03:00:00Z")), true);

if (failures > 0) {
  console.error(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log("\nTous les checks passent.");
