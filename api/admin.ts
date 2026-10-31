import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { requireRole } from "../lib/session.js";
import {
  deriveLegacyColumns,
  slugify,
  supportedTimezones,
  uniqueSlug,
  validateWindows,
  type WindowInput,
} from "../lib/admin-data.js";

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

function badRequest(res: VercelResponse, errors: string[]) {
  return json(res, 400, { error: errors.join(" · ") });
}

const PASSWORD_MIN = 8;

function publicUser(u: { id: number; email: string; name: string; role: string; isActive: boolean; createdAt: Date }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.isActive, createdAt: u.createdAt };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireRole(req, res, "ADMIN");
  if (!admin) return;

  const path = pathOf(req);
  const method = req.method;

  // ================= USERS =================
  if (path === "users") {
    if (method === "GET") {
      const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
      return json(res, 200, { users: users.map(publicUser) });
    }
    if (method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const role = body.role === "ADMIN" ? "ADMIN" : "USER";
      if (!email || !email.includes("@")) errors.push("Email invalide");
      if (!name) errors.push("Le nom est requis");
      if (password.length < PASSWORD_MIN) errors.push(`Le mot de passe doit faire ${PASSWORD_MIN} caractères minimum`);
      if (errors.length) return badRequest(res, errors);
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return badRequest(res, ["Cet email est déjà utilisé"]);
      const user = await prisma.user.create({ data: { email, name, role, passwordHash: hashPassword(password) } });
      return json(res, 201, { user: publicUser(user) });
    }
    if (method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return json(res, 404, { error: "Utilisateur introuvable" });
      const body = bodyOf(req);
      const errors: string[] = [];
      const data: { email?: string; name?: string; role?: "ADMIN" | "USER"; isActive?: boolean; passwordHash?: string } = {};
      if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
      if (typeof body.email === "string" && body.email.trim().toLowerCase() !== target.email) {
        const email = body.email.trim().toLowerCase();
        if (!email.includes("@")) errors.push("Email invalide");
        else {
          const taken = await prisma.user.findUnique({ where: { email } });
          if (taken && taken.id !== id) errors.push("Cet email est déjà utilisé");
          else data.email = email;
        }
      }
      if (body.role === "ADMIN" || body.role === "USER") {
        if (target.role === "ADMIN" && target.isActive && body.role === "USER") {
          const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
          if (otherAdmins === 0) errors.push("Impossible de retirer le dernier administrateur actif");
          else data.role = body.role;
        } else {
          data.role = body.role;
        }
      }
      if (typeof body.isActive === "boolean" && body.isActive !== target.isActive) {
        if (target.role === "ADMIN" && !body.isActive) {
          const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
          if (otherAdmins === 0) errors.push("Impossible de désactiver le dernier administrateur actif");
          else data.isActive = body.isActive;
        } else {
          data.isActive = body.isActive;
        }
      }
      const password = typeof body.password === "string" ? body.password : "";
      if (password) {
        if (password.length < PASSWORD_MIN) errors.push(`Le mot de passe doit faire ${PASSWORD_MIN} caractères minimum`);
        else data.passwordHash = hashPassword(password);
      }
      if (errors.length) return badRequest(res, errors);
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data });
        if (data.passwordHash || data.isActive === false) {
          await tx.userAuthToken.deleteMany({ where: { user_id: id } });
        }
      });
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      return json(res, 200, { user: publicUser(user) });
    }
    if (method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      if (id === admin.id) return badRequest(res, ["Vous ne pouvez pas supprimer votre propre compte"]);
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return json(res, 404, { error: "Utilisateur introuvable" });
      if (target.role === "ADMIN" && target.isActive) {
        const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
        if (otherAdmins === 0) return badRequest(res, ["Impossible de supprimer le dernier administrateur actif"]);
      }
      await prisma.user.delete({ where: { id } });
      return json(res, 200, { ok: true });
    }
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.end("Method not allowed");
  }

  // ================= OVERVIEW =================
  if (path === "overview" && method === "GET") {
    try {
      const [users, sessions, categories, instruments, windows, assets, forexSessions, seasons] = await Promise.all([
        prisma.user.count(),
        prisma.session.count(),
        prisma.category.count(),
        prisma.instrument.count(),
        prisma.instrumentWindow.count(),
        prisma.asset.count(),
        prisma.forexSession.count(),
        prisma.season.count(),
      ]);
      const recent = await prisma.instrument.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { category: true, session: true },
      });
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { stats: { users, sessions, categories, instruments, windows, assets, forexSessions, seasons }, recent });
    } catch {
      return json(res, 500, { error: "Erreur interne" });
    }
  }

  // ================= CATEGORIES =================
  if (path === "categories") {
    if (method === "GET") {
      const categories = await prisma.category.findMany({
        orderBy: { position: "asc" },
        include: { _count: { select: { instruments: true } } },
      });
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { categories });
    }
    if (method === "POST") {
      const body = bodyOf(req);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const position = Number(body.position ?? 0);
      if (!name) return badRequest(res, ["Le nom est requis"]);
      const slug = await uniqueSlug(typeof body.slug === "string" && body.slug ? body.slug : name, (candidate) =>
        prisma.category.findUnique({ where: { slug: candidate } }).then(Boolean)
      );
      const category = await prisma.category.create({ data: { name, slug, position: Number.isInteger(position) ? position : 0 } });
      return json(res, 201, { category });
    }
    if (method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.category.findUnique({ where: { id } });
      if (!existing) return json(res, 404, { error: "Catégorie introuvable" });
      const body = bodyOf(req);
      const data: { name?: string; position?: number } = {};
      if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
      if (body.position !== undefined && Number.isInteger(Number(body.position))) data.position = Number(body.position);
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);
      const category = await prisma.category.update({ where: { id }, data });
      return json(res, 200, { category });
    }
    if (method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { instruments: true } } } });
      if (!existing) return json(res, 404, { error: "Catégorie introuvable" });
      if (existing._count.instruments > 0) {
        return badRequest(res, [`${existing._count.instruments} instrument(s) rattaché(s) : déplacez-les avant de supprimer la catégorie`]);
      }
      await prisma.category.delete({ where: { id } });
      return json(res, 200, { ok: true });
    }
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.end("Method not allowed");
  }

  // ================= SESSIONS =================
  if (path === "sessions") {
    const timezones = supportedTimezones();
    const REGIONS = ["ASIA", "EUROPE", "AMERICA", "OCEANIA", "AFRICA", "GLOBAL"];
    if (method === "GET") {
      const sessions = await prisma.session.findMany({
        orderBy: { position: "asc" },
        include: { _count: { select: { instruments: true } } },
      });
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { sessions });
    }
    if (method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const region = typeof body.region === "string" && REGIONS.includes(body.region) ? body.region : "";
      const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
      if (!name) errors.push("Le nom est requis");
      if (!region) errors.push("Région invalide");
      if (!timezone || (!timezones.has(timezone) && timezone !== "UTC")) errors.push(`Fuseau horaire inconnu ${timezone}`);
      if (errors.length) return badRequest(res, errors);
      const slug = await uniqueSlug(typeof body.slug === "string" && body.slug.trim() ? body.slug : name, (candidate) =>
        prisma.session.findUnique({ where: { slug: candidate } }).then(Boolean)
      );
      const session = await prisma.session.create({
        data: { name, slug, region: region as never, timezone, is247: body.is247 === true, flag: typeof body.flag === "string" ? body.flag.trim() : null, color: typeof body.color === "string" ? body.color.trim() : null, position: Number.isInteger(Number(body.position)) ? Number(body.position) : 0 },
      });
      return json(res, 201, { session });
    }
    if (method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.session.findUnique({ where: { id } });
      if (!existing) return json(res, 404, { error: "Séance introuvable" });
      const body = bodyOf(req);
      const errors: string[] = [];
      const data: Record<string, unknown> = {};
      if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
      if (typeof body.region === "string" && REGIONS.includes(body.region)) data.region = body.region;
      if (typeof body.timezone === "string" && body.timezone.trim()) {
        const tz = body.timezone.trim();
        if (!timezones.has(tz) && tz !== "UTC") errors.push(`Fuseau horaire inconnu ${tz}`);
        else data.timezone = tz;
      }
      if (typeof body.is247 === "boolean") {
        if (existing.is247 && !body.is247) {
          const attached = await prisma.instrument.count({ where: { session: { id }, is247: true } });
          if (attached > 0) errors.push("Des instruments 24/7 rattachés : marquez-les avant de désactiver cette séance");
        }
        data.is247 = body.is247;
      }
      if (typeof body.flag === "string") data.flag = body.flag.trim() || null;
      if (typeof body.color === "string") data.color = body.color.trim() || null;
      if (body.position !== undefined && Number.isInteger(Number(body.position))) data.position = Number(body.position);
      if (errors.length) return badRequest(res, errors);
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);
      const session = await prisma.session.update({ where: { id }, data });
      return json(res, 200, { session });
    }
    if (method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.session.findUnique({ where: { id }, include: { _count: { select: { instruments: true } } } });
      if (!existing) return json(res, 404, { error: "Séance introuvable" });
      if (existing._count.instruments > 0) {
        return badRequest(res, [`${existing._count.instruments} instrument(s) rattaché(s) : déplacez-les avant de supprimer la séance`]);
      }
      await prisma.session.delete({ where: { id } });
      return json(res, 200, { ok: true });
    }
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.end("Method not allowed");
  }

  // ================= INSTRUMENTS =================
  if (path === "instruments") {
    const timezones = supportedTimezones();
    if (method === "GET") {
      const [instruments, sessions, categories] = await Promise.all([
        prisma.instrument.findMany({ orderBy: { name: "asc" }, include: { session: true, category: true, windows: { orderBy: [{ kind: "asc" }, { position: "asc" }] } } }),
        prisma.session.findMany({ orderBy: { position: "asc" } }),
        prisma.category.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { instruments: true } } } }),
      ]);
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { instruments, sessions, categories });
    }
    if (method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) errors.push("Le nom est requis");
      const categoryId = Number(body.categoryId);
      const sessionId = Number(body.sessionId);
      if (!Number.isInteger(categoryId) || !Number.isInteger(sessionId)) errors.push("Catégorie et séance obligatoires");
      const description = typeof body.description === "string" ? body.description.trim() : null;
      const check = validateWindows(body.windows, timezones);
      if (!check.ok) return badRequest(res, check.errors);
      if (errors.length) return badRequest(res, errors);
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return badRequest(res, ["Séance inconnue"]);
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return badRequest(res, ["Catégorie inconnue"]);
      const slug = await uniqueSlug(name, (candidate) => prisma.instrument.findUnique({ where: { slug: candidate } }).then(Boolean));
      const is247 = session.is247;
      const created = await prisma.$transaction(async (tx) => {
        const instrument = await tx.instrument.create({ data: { name, slug, description, categoryId, sessionId, ...deriveLegacyColumns(check.windows as WindowInput[], is247) } });
        await tx.instrumentWindow.createMany({ data: (check.windows as WindowInput[]).map((w, position) => ({ instrumentId: instrument.id, ...w, position })) });
        return instrument;
      });
      return json(res, 201, { instrument: created });
    }
    if (method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.instrument.findUnique({ where: { id }, include: { session: true } });
      if (!existing) return json(res, 404, { error: "Instrument introuvable" });
      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) errors.push("Le nom est requis");
      const categoryId = Number(body.categoryId);
      const sessionId = Number(body.sessionId);
      if (!Number.isInteger(categoryId) || !Number.isInteger(sessionId)) errors.push("Catégorie et séance obligatoires");
      if (errors.length) return badRequest(res, errors);
      const description = typeof body.description === "string" ? body.description.trim() : null;
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return badRequest(res, ["Séance inconnue"]);
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return badRequest(res, ["Catégorie inconnue"]);
      const check = validateWindows(body.windows, timezones);
      if (!check.ok) return badRequest(res, check.errors);
      let slug = existing.slug;
      if (slugify(name) !== slugify(existing.name)) {
        slug = await uniqueSlug(name, (candidate) => prisma.instrument.findUnique({ where: { slug: candidate } }).then((row) => Boolean(row && row.id !== id)));
      }
      const windows = check.windows as WindowInput[];
      await prisma.$transaction(async (tx) => {
        await tx.instrument.update({ where: { id }, data: { name, slug, description, categoryId, sessionId, ...deriveLegacyColumns(windows, session.is247) } });
        await tx.instrumentWindow.deleteMany({ where: { instrumentId: id } });
        await tx.instrumentWindow.createMany({ data: windows.map((w, position) => ({ instrumentId: id, ...w, position })) });
      });
      const updated = await prisma.instrument.findUnique({ where: { id } });
      return json(res, 200, { instrument: updated });
    }
    if (method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.instrument.findUnique({ where: { id } });
      if (!existing) return json(res, 404, { error: "Instrument introuvable" });
      await prisma.instrument.delete({ where: { id } });
      return json(res, 200, { ok: true, deleted: existing.id });
    }
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.end("Method not allowed");
  }

  res.statusCode = 404;
  res.end("Not found");
}
