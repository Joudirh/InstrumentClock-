import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/password";
import { requireRole } from "../../lib/session";

function publicUser(u: { id: number; email: string; name: string; role: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireRole(req, res, "USER");
  if (!user) return;

  if (req.method === "GET") {
    return res.status(200).json({ user: publicUser(user) });
  }

  if (req.method === "PUT") {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const data: { name?: string; passwordHash?: string } = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    const password = typeof body.password === "string" ? body.password : "";
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: "Le mot de passe doit faire 8 caractères minimum" });
      data.passwordHash = hashPassword(password);
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Aucune modification" });

    if (data.passwordHash) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data }),
        prisma.userAuthToken.deleteMany({ where: { user_id: user.id } }),
      ]);
    } else {
      await prisma.user.update({ where: { id: user.id }, data });
    }
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return res.status(200).json({ user: publicUser(updated) });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
