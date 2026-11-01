import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../lib/session.js";
import { hashPassword } from "../lib/password.js";

function bodyOf(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
}

function pathOf(req: VercelRequest): string {
  return String((req as any).query?.__path ?? "");
}

function json(res: VercelResponse, code: number, data: unknown) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

const PASSWORD_MIN = 8;

function publicUser(u: { id: number; email: string; name: string; role: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireRole(req, res, "USER");
  if (!user) return;

  const path = pathOf(req);
  const method = req.method;

  // ---------- PROFILE ----------
  if ((path === "" || path === "profile") && method === "GET") {
    return json(res, 200, { user: publicUser(user) });
  }
  if ((path === "" || path === "profile") && method === "PUT") {
    const body = bodyOf(req);
    const data: { name?: string; passwordHash?: string } = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    const password = typeof body.password === "string" ? body.password : "";
    if (password) {
      if (password.length < PASSWORD_MIN) return json(res, 400, { error: `Le mot de passe doit faire ${PASSWORD_MIN} caractères minimum` });
      data.passwordHash = hashPassword(password);
    }
    if (Object.keys(data).length === 0) return json(res, 400, { error: "Aucune modification" });
    if (data.passwordHash) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data }),
        prisma.userAuthToken.deleteMany({ where: { user_id: user.id } }),
      ]);
    } else {
      await prisma.user.update({ where: { id: user.id }, data });
    }
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return json(res, 200, { user: publicUser(updated) });
  }

  // ---------- FAVORITES ----------
  if (path === "favorites" && method === "GET") {
    const favs = await prisma.instrumentFavorite.findMany({
      where: { userId: user.id },
      include: { instrument: { select: { id: true, name: true, slug: true, description: true, category: { select: { name: true } }, session: { select: { slug: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return json(res, 200, { favorites: favs.map((f) => ({ id: f.id, instrumentId: f.instrumentId, instrument: f.instrument, createdAt: f.createdAt })) });
  }
  if (path === "favorites" && method === "POST") {
    const body = bodyOf(req);
    const instrumentId = Number(body.instrumentId);
    if (!Number.isInteger(instrumentId) || instrumentId < 1) return json(res, 400, { error: "instrumentId invalide" });
    const inst = await prisma.instrument.findUnique({ where: { id: instrumentId } });
    if (!inst) return json(res, 404, { error: "Instrument introuvable" });
    const fav = await prisma.instrumentFavorite.upsert({
      where: { userId_instrumentId: { userId: user.id, instrumentId } },
      update: {},
      create: { userId: user.id, instrumentId },
    });
    return json(res, 200, { favorite: fav });
  }
  if (path === "favorites" && method === "DELETE") {
    const id = Number(req.query.id);
    if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: "id invalide" });
    const fav = await prisma.instrumentFavorite.findUnique({ where: { id } });
    if (!fav || fav.userId !== user.id) return json(res, 404, { error: "Favori introuvable" });
    await prisma.instrumentFavorite.delete({ where: { id } });
    return json(res, 200, { ok: true });
  }

  // ---------- ALERTS ----------
  const ALLOWED_KINDS = ["optimal-open", "optimal-close"];
  if (path === "alerts" && method === "GET") {
    const alerts = await prisma.marketAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return json(res, 200, { alerts: alerts.map((a) => ({ id: a.id, instrumentId: a.instrumentId, kind: a.kind, active: a.active, createdAt: a.createdAt })) });
  }
  if (path === "alerts" && method === "POST") {
    const body = bodyOf(req);
    const instrumentId = Number(body.instrumentId);
    const kind = typeof body.kind === "string" ? body.kind : "optimal-open";
    if (!ALLOWED_KINDS.includes(kind)) return json(res, 400, { error: "Type d'alerte invalide" });
    if (!Number.isInteger(instrumentId)) return json(res, 400, { error: "instrumentId requis" });
    const inst = await prisma.instrument.findUnique({ where: { id: instrumentId } });
    if (!inst) return json(res, 404, { error: "Instrument introuvable" });
    const alert = await prisma.marketAlert.create({ data: { userId: user.id, instrumentId, kind } });
    return json(res, 201, { alert });
  }
  if (path === "alerts" && method === "PUT") {
    const id = Number((req as any).query?.id);
    if (!Number.isInteger(id)) return json(res, 400, { error: "id requis" });
    const target = await prisma.marketAlert.findUnique({ where: { id } });
    if (!target || target.userId !== user.id) return json(res, 404, { error: "Alerte introuvable" });
    const body = bodyOf(req);
    const data: { kind?: string; isActive?: boolean } = {};
    if (typeof body.kind === "string") {
      if (!ALLOWED_KINDS.includes(body.kind)) return json(res, 400, { error: "Type d'alerte invalide" });
      data.kind = body.kind;
    }
    if (typeof body.active === "boolean") data.isActive = body.active;
    if (Object.keys(data).length === 0) return json(res, 400, { error: "Aucune modification" });
    const alert = await prisma.marketAlert.update({ where: { id }, data });
    return json(res, 200, { alert });
  }
  if (path === "alerts" && method === "DELETE") {
    const id = Number((req as any).query?.id);
    if (!Number.isInteger(id)) return json(res, 400, { error: "id requis" });
    const target = await prisma.marketAlert.findUnique({ where: { id } });
    if (!target || target.userId !== user.id) return json(res, 404, { error: "Alerte introuvable" });
    await prisma.marketAlert.delete({ where: { id } });
    return json(res, 200, { ok: true });
  }

  res.statusCode = 404;
  res.end("Not found");
}
