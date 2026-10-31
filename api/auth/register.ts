import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/password";
import { createSession, isSecureRequest, sessionCookieHeader } from "../../lib/session";
import { rateLimit, clientIp, WINDOW_MS } from "../../lib/rate-limit";

const PASSWORD_MIN = 8;

function bodyOf(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting sur l'inscription (clé IP + endpoint).
  const limit = rateLimit(`register:${clientIp(req)}`);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
    return res.status(429).json({ error: "Trop de tentatives, réessayez plus tard" });
  }

  const body = bodyOf(req);
  // Le rôle est toujours USER : l'inscription publique ne peut pas créer d'ADMIN.
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const errors: string[] = [];
  if (!email || !email.includes("@")) errors.push("Email invalide");
  if (!name) errors.push("Le nom est requis");
  if (!password || password.length < PASSWORD_MIN) errors.push(`Le mot de passe doit faire ${PASSWORD_MIN} caractères minimum`);
  if (errors.length) return res.status(400).json({ error: errors.join(" · ") });

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Cet email est déjà utilisé" });

    const user = await prisma.user.create({
      data: { email, name, role: "USER", passwordHash: hashPassword(password) },
    });

    const token = await createSession(user.id);
    res.setHeader(
      "Set-Cookie",
      sessionCookieHeader(token, isSecureRequest(req as unknown as VercelRequest))
    );
    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur d'inscription" });
  }
}
