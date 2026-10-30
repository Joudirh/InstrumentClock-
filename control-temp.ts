import "dotenv/config";
import { prisma } from "./lib/prisma";

const q = async (n: string, sql: string) => {
  const r = await prisma.$queryRawUnsafe(sql);
  console.log(`${n}:`);
  console.log(JSON.stringify(r, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v)));
  return r;
};

await (async () => {
  await q("3.1 volumes", `SELECT (SELECT count(*)::int FROM sessions) AS sessions, (SELECT count(*)::int FROM categories) AS categories, (SELECT count(*)::int FROM instruments) AS instruments, (SELECT count(*)::int FROM instrument_windows) AS windows`);

  await q("3.1 couverture", `SELECT i.id::int, i.name::text FROM instruments i WHERE NOT EXISTS (SELECT 1 FROM instrument_windows w WHERE w.instrument_id=i.id AND w.kind='TRADING') OR NOT EXISTS (SELECT 1 FROM instrument_windows w WHERE w.instrument_id=i.id AND w.kind='OPTIMAL')`);

  await q("3.2 répartition", `SELECT s.slug::text, count(*)::int AS nb FROM instruments i JOIN sessions s ON s.id=i.session_id GROUP BY s.slug, s.position ORDER BY s.position`);

  await q("3.3 fuseaux", `SELECT DISTINCT timezone::text FROM instrument_windows WHERE timezone <> 'UTC' AND timezone NOT IN (SELECT name::text FROM pg_timezone_names)`);

  await q("3.3 minuit", `SELECT i.id::int, i.name::text, w.days::text, w.start_minute::int, w.end_minute::int FROM instrument_windows w JOIN instruments i ON i.id=w.instrument_id WHERE w.end_minute>1440 ORDER BY i.id`);

  await q("3.3 séquences", `SELECT x.t::text, x.max_id::bigint, x.last_value::bigint FROM (SELECT 'instruments' AS t, (SELECT max(id) FROM instruments) AS max_id, (SELECT last_value FROM instruments_id_seq) AS last_value UNION ALL SELECT 'categories', (SELECT max(id) FROM categories), (SELECT last_value FROM categories_id_seq) UNION ALL SELECT 'sessions', (SELECT max(id) FROM sessions), (SELECT last_value FROM sessions_id_seq)) x`);

  await q("2.1 control: days NULL/vide", `SELECT id::int FROM instrument_windows WHERE days IS NULL OR cardinality(days)=0`);

  await q("2.2 control: doublons (instrument,kind,position)", `SELECT instrument_id::int, kind::text, position::int, count(*)::int FROM instrument_windows GROUP BY 1,2,3 HAVING count(*)>1`);

  await q("3.4 cohérence legacy open_hour", `SELECT i.id::int, i.name::text, round(i.open_hour*60)::int AS legacy_start, w.start_minute::int FROM instruments i JOIN LATERAL (SELECT * FROM instrument_windows WHERE instrument_id=i.id AND kind='TRADING' ORDER BY position LIMIT 1) w ON true WHERE round(i.open_hour*60)::int <> w.start_minute`);

  await q("3.4 pauses Tokyo/HK/Shanghai", `SELECT w.instrument_id::int, w.position::int, w.start_minute::int, w.end_minute::int FROM instrument_windows w WHERE w.instrument_id IN (94,95,120,121,122) AND w.kind='TRADING' ORDER BY w.instrument_id, w.position`);

  await prisma.$disconnect();
})();
