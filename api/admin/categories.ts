import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import { slugify, uniqueSlug } from "../../lib/admin-data";
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
    if (req.method === "GET") {
      const categories = await prisma.category.findMany({
        orderBy: { position: "asc" },
        include: { _count: { select: { instruments: true } } },
      });
      return res.setHeader("Cache-Control", "no-store").status(200).json({ categories });
    }

    if (req.method === "POST") {
      const body = bodyOf(req);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const position = Number(body.position ?? 0);
      if (!name) return badRequest(res, ["Le nom est requis"]);
      const slug = await uniqueSlug(body.slug && typeof body.slug === "string" ? body.slug : name, (candidate) =>
        prisma.category.findUnique({ where: { slug: candidate } }).then(Boolean)
      );
      const category = await prisma.category.create({
        data: { name, slug, position: Number.isInteger(position) ? position : 0 },
      });
      return res.status(201).json({ category });
    }

    if (req.method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.category.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Catégorie introuvable" });
      const body = bodyOf(req);
      const data: { name?: string; position?: number } = {};
      if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
      if (body.position !== undefined && Number.isInteger(Number(body.position))) {
        data.position = Number(body.position);
      }
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);
      const category = await prisma.category.update({ where: { id }, data });
      return res.status(200).json({ category });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.category.findUnique({
        where: { id },
        include: { _count: { select: { instruments: true } } },
      });
      if (!existing) return res.status(404).json({ error: "Catégorie introuvable" });
      if (existing._count.instruments > 0) {
        return badRequest(res, [
          `${existing._count.instruments} instrument(s) rattaché(s) : déplacez-les avant de supprimer la catégorie`,
        ]);
      }
      await prisma.category.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
