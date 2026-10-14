import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: "ok", database: "up" });
  } catch (error) {
    console.error(error);
    return res.status(503).json({ status: "error", database: "down" });
  }
}
