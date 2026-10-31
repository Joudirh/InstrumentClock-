import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../lib/prisma.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [seasons, sessions] = await Promise.all([
      prisma.season.findMany({ orderBy: { key: "asc" } }),
      prisma.forexSession.findMany({ orderBy: { position: "asc" } }),
    ]);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ seasons, sessions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load sessions" });
  }
}
