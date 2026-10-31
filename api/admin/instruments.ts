import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import {
  deriveLegacyColumns,
  slugify,
  supportedTimezones,
  uniqueSlug,
  validateWindows,
  type WindowInput,
} from "../../lib/admin-data";
import { requireRole } from "../../lib/session";

function bodyOf(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
}

function badRequest(res: VercelResponse, errors: string[]) {
  return res.status(400).json({ error: errors.join(" · ") });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireRole(req, res, "ADMIN"))) return;

  try {
    const timezones = supportedTimezones();

    if (req.method === "GET") {
      const [instruments, sessions, categories] = await Promise.all([
        prisma.instrument.findMany({
          orderBy: { name: "asc" },
          include: {
            session: true,
            category: true,
            windows: { orderBy: [{ kind: "asc" }, { position: "asc" }] },
          },
        }),
        prisma.session.findMany({ orderBy: { position: "asc" } }),
        prisma.category.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { instruments: true } } } }),
      ]);
      return res.setHeader("Cache-Control", "no-store").status(200).json({ instruments, sessions, categories });
    }

    if (req.method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) errors.push("Le nom est requis");
      const categoryId = Number(body.categoryId);
      const sessionId = Number(body.sessionId);
      if (!Number.isInteger(categoryId) || !Number.isInteger(sessionId)) {
        errors.push("Catégorie et séance obligatoires");
      }
      const description = typeof body.description === "string" ? body.description.trim() : null;
      const check = validateWindows(body.windows, timezones);
      if (!check.ok) return badRequest(res, check.errors);
      if (errors.length) return badRequest(res, errors);

      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return badRequest(res, ["Séance inconnue"]);
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return badRequest(res, ["Catégorie inconnue"]);

      const slug = await uniqueSlug(name, (candidate) =>
        prisma.instrument.findUnique({ where: { slug: candidate } }).then(Boolean)
      );
      const is247 = session.is247;

      const created = await prisma.$transaction(async (tx) => {
        const instrument = await tx.instrument.create({
          data: {
            name,
            slug,
            description,
            categoryId,
            sessionId,
            ...deriveLegacyColumns(check.windows as WindowInput[], is247),
          },
        });
        await tx.instrumentWindow.createMany({
          data: (check.windows as WindowInput[]).map((w, position) => ({
            instrumentId: instrument.id,
            ...w,
            position,
          })),
        });
        return instrument;
      });
      return res.status(201).json({ instrument: created });
    }

    if (req.method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.instrument.findUnique({
        where: { id },
        include: { session: true },
      });
      if (!existing) return res.status(404).json({ error: "Instrument introuvable" });

      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) errors.push("Le nom est requis");
      const categoryId = Number(body.categoryId);
      const sessionId = Number(body.sessionId);
      if (!Number.isInteger(categoryId) || !Number.isInteger(sessionId)) {
        errors.push("Catégorie et séance obligatoires");
      }
      if (errors.length) return badRequest(res, errors);
      const description = typeof body.description === "string" ? body.description.trim() : null;

      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return badRequest(res, ["Séance inconnue"]);
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return badRequest(res, ["Catégorie inconnue"]);

      const check = validateWindows(body.windows, timezones);
      if (!check.ok) return badRequest(res, check.errors);

      // Le slug ne change que si le nom change véritablement (garde les liens stables).
      let slug = existing.slug;
      if (slugify(name) !== slugify(existing.name)) {
        slug = await uniqueSlug(name, (candidate) =>
          prisma.instrument
            .findUnique({ where: { slug: candidate } })
            .then((row) => Boolean(row && row.id !== id))
        );
      }

      const windows = check.windows as WindowInput[];
      await prisma.$transaction(async (tx) => {
        await tx.instrument.update({
          where: { id },
          data: { name, slug, description, categoryId, sessionId, ...deriveLegacyColumns(windows, session.is247) },
        });
        // Remplacement idempotent des plages (positions réindexées 0..n).
        await tx.instrumentWindow.deleteMany({ where: { instrumentId: id } });
        await tx.instrumentWindow.createMany({
          data: windows.map((w, position) => ({ instrumentId: id, ...w, position })),
        });
      });
      const updated = await prisma.instrument.findUnique({ where: { id } });
      return res.status(200).json({ instrument: updated });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.instrument.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Instrument introuvable" });
      await prisma.instrument.delete({ where: { id } });
      return res.status(200).json({ ok: true, deleted: existing.id });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
