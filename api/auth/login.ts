import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import { verifyPassword } from "../../lib/password";
import {
  createSession,
  isSecureRequest,
  sessionCookieHeader,
} from "../../lib/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = await createSession(user.id);
    res.setHeader(
      "Set-Cookie",
      sessionCookieHeader(token, isSecureRequest(req as unknown as VercelRequest))
    );
    return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur de connexion" });
  }
}
