import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../lib/prisma";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: { position: "asc" },
      include: {
        instruments: {
          orderBy: { name: "asc" },
          include: {
            session: true,
            windows: { orderBy: [{ kind: "asc" }, { position: "asc" }] },
          },
        },
      },
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load instruments" });
  }
}
