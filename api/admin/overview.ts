import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../lib/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireAuth(req, res))) return;

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
    return res.setHeader("Cache-Control", "no-store").status(200).json({
      stats: { users, sessions, categories, instruments, windows, assets, forexSessions, seasons },
      recent,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
