import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import { supportedTimezones, uniqueSlug } from "../../lib/admin-data";
import { requireAuth } from "../../lib/session";

function bodyOf(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
}

function badRequest(res: VercelResponse, errors: string[]) {
  return res.status(400).json({ error: errors.join(" · ") });
}

const REGIONS = ["ASIA", "EUROPE", "AMERICA", "OCEANIA", "AFRICA", "GLOBAL"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireAuth(req, res))) return;

  try {
    const timezones = supportedTimezones();

    if (req.method === "GET") {
      const sessions = await prisma.session.findMany({
        orderBy: { position: "asc" },
        include: { _count: { select: { instruments: true } } },
      });
      return res.setHeader("Cache-Control", "no-store").status(200).json({ sessions });
    }

    if (req.method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const region = typeof body.region === "string" && REGIONS.includes(body.region) ? body.region : "";
      const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
      if (!name) errors.push("Le nom est requis");
      if (!region) errors.push("Région invalide");
      if (!timezone || (!timezones.has(timezone) && timezone !== "UTC")) {
        errors.push(`Fuseau horaire inconnu ${timezone}`);
      }
      if (errors.length) return badRequest(res, errors);

      const slug = await uniqueSlug(
        typeof body.slug === "string" && body.slug.trim() ? body.slug : name,
        (candidate) => prisma.session.findUnique({ where: { slug: candidate } }).then(Boolean)
      );
      const session = await prisma.session.create({
        data: {
          name,
          slug,
          region: region as never,
          timezone,
          is247: body.is247 === true,
          flag: typeof body.flag === "string" ? body.flag.trim() : null,
          color: typeof body.color === "string" ? body.color.trim() : null,
          position: Number.isInteger(Number(body.position)) ? Number(body.position) : 0,
        },
      });
      return res.status(201).json({ session });
    }

    if (req.method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.session.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Séance introuvable" });
      const body = bodyOf(req);
      const errors: string[] = [];
      const data: Record<string, unknown> = {};
      if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
      if (typeof body.region === "string" && REGIONS.includes(body.region)) data.region = body.region;
      if (typeof body.timezone === "string" && body.timezone.trim()) {
        const timezone = body.timezone.trim();
        if (!timezones.has(timezone) && timezone !== "UTC") errors.push(`Fuseau horaire inconnu ${timezone}`);
        else data.timezone = timezone;
      }
      if (typeof body.is247 === "boolean") {
        if (existing.is247 && !body.is247) {
          const attached = await prisma.instrument.count({ where: { session: { id }, is247: true } });
          if (attached > 0) {
            errors.push("Des instruments 24/7 rattachés : marquez-les avant de désactiver cette séance");
          }
        }
        data.is247 = body.is247;
      }
      if (typeof body.flag === "string") data.flag = body.flag.trim() || null;
      if (typeof body.color === "string") data.color = body.color.trim() || null;
      if (body.position !== undefined && Number.isInteger(Number(body.position))) data.position = Number(body.position);
      if (errors.length) return badRequest(res, errors);
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);
      const session = await prisma.session.update({ where: { id }, data });
      return res.status(200).json({ session });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.session.findUnique({
        where: { id },
        include: { _count: { select: { instruments: true } } },
      });
      if (!existing) return res.status(404).json({ error: "Séance introuvable" });
      if (existing._count.instruments > 0) {
        return badRequest(res, [
          `${existing._count.instruments} instrument(s) rattaché(s) : déplacez-les avant de supprimer la séance`,
        ]);
      }
      await prisma.session.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
