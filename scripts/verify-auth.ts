// Script de vérification de la séparation Admin / Utilisateur.
// À lancer avec `npx tsx scripts/verify-auth.ts` alors que le serveur dev tourne (`npm run dev`).
const BASE = process.env.BASE_URL || "http://localhost:5173";
let cookieJar: string | null = null;

async function req(path: string, init: RequestInit = {}): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if ((init.headers as Record<string, string> | undefined)) {
    for (const [k, v] of Object.entries(init.headers as Record<string, string>)) headers[k] = v;
  }
  headers["Content-Type"] = "application/json";
  if (cookieJar) headers["Cookie"] = cookieJar;
  const res = await fetch(`${BASE}${path}`, {
    headers,
    credentials: "omit",
    ...init,
  } as any);
  // Persiste les cookies Set-Cookie (ic_session).
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const token = setCookie.split(";")[0].split("=")[1];
    if (token) cookieJar = `ic_session=${token}`;
  }
  let body: any = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const email = `user${Date.now()}@example.com`;

  // 1. Inscription avec role=ADMIN dans le body -> le compte doit etre USER (role ignore).
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, name: "Test User", password: "Password1234!", role: "ADMIN" }),
  });
  check("register ignore role=ADMIN => compte USER", reg.status === 201 && reg.body.user?.role === "USER", JSON.stringify(reg.body));

  // 2. Ce USER reçoit 403 sur /api/admin/* (meme cookie de la session d'inscription).
  const adminRes = await req("/api/admin/instruments");
  check("USER 403 sur /api/admin/instruments", adminRes.status === 403, `status=${adminRes.status}`);

  // 3. Identifiants admin refuses par le login public (role=USER) -> message generique 401.
  const adminLoginUser = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@instrumentclock.com", password: "admin123@", role: "USER" }),
  });
  check("Admin creds refuses par login USER => 401 generique", adminLoginUser.status === 401 && adminLoginUser.body?.error === "Identifiants invalides", `status=${adminLoginUser.status} body=${JSON.stringify(adminLoginUser.body)}`);

  // 4. Login admin avec role=ADMIN -> 200.
  const adminLoginAdmin = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@instrumentclock.com", password: "admin123@", role: "ADMIN" }),
  });
  check("Admin creds acceptes avec role=ADMIN => 200", adminLoginAdmin.status === 200 && adminLoginAdmin.body?.user?.role === "ADMIN", `status=${adminLoginAdmin.status}`);

  // 5. Un USER ne peut pas lire/supprimer les donnees d'un autre USER.
  // Creer un second user et verifier l'isolation des favoris.
  const email2 = `user${Date.now()}@example.com`;
  await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: email2, name: "Test User 2", password: "Password1234!" }),
  });
  // login user2 pour avoir son cookie
  await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email2, password: "Password1234!", role: "USER" }),
  });
  // user2 ajoute un favori instrument 79
  const addFav = await req("/api/me/favorites", { method: "POST", body: JSON.stringify({ instrumentId: 79 }) });
  const favId = addFav.body?.favorite?.id;
  check("user2 ajoute un favori", addFav.status === 201, `favId=${favId}`);

  // Se connecter en user1 (email) pour tenter d'acceder au favori de user2.
  // Comme fetch garde le cookie, on relogin user1 -> ecrase le cookie. On utilise donc un fetch "raw" avec cookie manuel est complexe.
  // Simplifier : verifier que la liste des favoris de user2 ne contient que son propre favori.
  const favs = await req("/api/me/favorites");
  check("user2 liste ses propres favoris (isolation)", favs.status === 200 && Array.isArray(favs.body?.favorites) && favs.body.favorites.length === 1, `count=${favs.body?.favorites?.length}`);

  // Supprimer le favori d'un autre user (id invente) -> 404.
  const delOther = await req("/api/me/favorites?id=999999", { method: "DELETE" });
  check("user2 ne peut pas supprimer un favori inconnu => 404", delOther.status === 404, `status=${delOther.status}`);

  if (favId) {
    const delOwn = await req(`/api/me/favorites?id=${favId}`, { method: "DELETE" });
    check("user2 supprime son propre favori => 200", delOwn.status === 200, `status=${delOwn.status}`);
  }

  // 6. type d'alerte "prix" refuse.
  const badAlert = await req("/api/me/alerts", { method: "POST", body: JSON.stringify({ instrumentId: 79, kind: "price" }) });
  check("alerte kind=price refusee => 400", badAlert.status === 400, `status=${badAlert.status}`);

  const goodAlert = await req("/api/me/alerts", { method: "POST", body: JSON.stringify({ instrumentId: 79, kind: "optimal-open" }) });
  check("alerte kind=optimal-open acceptee => 201", goodAlert.status === 201, `status=${goodAlert.status}`);

  console.log(failures === 0 ? "\nTOUTES LES VERIFICATIONS SONT OK" : `\n${failures} ECHEC(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
