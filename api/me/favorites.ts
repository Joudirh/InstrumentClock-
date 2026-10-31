import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import { requireRole } from "../../lib/session";

function bodyOf(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireRole(req, res, "USER");
  if (!user) return;

  if (req.method === "GET") {
    const favs = await prisma.instrumentFavorite.findMany({
      where: { userId: user.id },
      include: { instrument: true },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({
      favorites: (favs as any[]).map((f) => ({ id: f.id, instrument: f.instrument, createdAt: f.createdAt })),
    });
  }

  if (req.method === "POST") {
    const body = bodyOf(req);
    const instrumentId = Number(body.instrumentId);
    if (!Number.isInteger(instrumentId)) return res.status(400).json({ error: "instrumentId requis" });
    const inst = await prisma.instrument.findUnique({ where: { id: instrumentId } });
    if (!inst) return res.status(404).json({ error: "Instrument introuvable" });
    const fav = await prisma.instrumentFavorite.create({ data: { userId: user.id, instrumentId } });
    return res.status(201).json({ favorite: fav });
  }

  if (req.method === "DELETE") {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "id requis" });
    const fav = await prisma.instrumentFavorite.findUnique({ where: { id } });
    if (!fav || fav.userId !== user.id) return res.status(404).json({ error: "Favori introuvable" });
    await prisma.instrumentFavorite.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
