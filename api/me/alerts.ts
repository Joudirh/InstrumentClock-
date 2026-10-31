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
    const alerts = await prisma.marketAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({
      alerts: alerts.map((a) => ({ id: a.id, instrumentId: a.instrumentId, kind: a.kind, active: a.active, createdAt: a.createdAt })),
    });
  }

  if (req.method === "POST") {
    const body = bodyOf(req);
    const instrumentId = Number(body.instrumentId);
    const kind = typeof body.kind === "string" ? body.kind : "optimal-open";
    const allowedKinds = ["optimal-open", "optimal-close"];
    if (!allowedKinds.includes(kind)) return res.status(400).json({ error: "Type d'alerte invalide" });
    if (!Number.isInteger(instrumentId)) return res.status(400).json({ error: "instrumentId requis" });
    const inst = await prisma.instrument.findUnique({ where: { id: instrumentId } });
    if (!inst) return res.status(404).json({ error: "Instrument introuvable" });
    const alert = await prisma.marketAlert.create({ data: { userId: user.id, instrumentId, kind } });
    return res.status(201).json({ alert });
  }

  if (req.method === "PUT") {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "id requis" });
    const target = await prisma.marketAlert.findUnique({ where: { id } });
    if (!target || target.userId !== user.id) return res.status(404).json({ error: "Alerte introuvable" });
    const body = bodyOf(req);
    const data: { kind?: string; isActive?: boolean } = {};
    const allowedKinds = ["optimal-open", "optimal-close"];
    if (typeof body.kind === "string") {
      if (!allowedKinds.includes(body.kind)) return res.status(400).json({ error: "Type d'alerte invalide" });
      data.kind = body.kind;
    }
    if (typeof body.active === "boolean") data.isActive = body.active;
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Aucune modification" });
    const alert = await prisma.marketAlert.update({ where: { id }, data });
    return res.status(200).json({ alert });
  }

  if (req.method === "DELETE") {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "id requis" });
    const target = await prisma.marketAlert.findUnique({ where: { id } });
    if (!target || target.userId !== user.id) return res.status(404).json({ error: "Alerte introuvable" });
    await prisma.marketAlert.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
