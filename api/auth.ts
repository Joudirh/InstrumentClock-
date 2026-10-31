import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../lib/password.js";
import { hashPassword } from "../lib/password.js";
import {
  createSession,
  destroySession,
  getSessionUser,
  sessionCookieHeader,
  clearSessionCookieHeader,
  isSecureRequest,
} from "../lib/session.js";
import { rateLimit, clientIp, WINDOW_MS } from "../lib/rate-limit.js";

const DEBUG = process.env.DEBUG_API === "1";

function bodyOf(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
}

function pathOf(req: VercelRequest): string {
  return String((req as any).query?.__path ?? "");
}

function json(res: VercelResponse, code: number, data: unknown) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

const PASSWORD_MIN = 8;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = pathOf(req);
  const method = req.method;

  // ---------- LOGIN ----------
  if (method === "POST" && (path === "" || path === "login")) {
    const limit = rateLimit(`login:${clientIp(req)}`);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
      return json(res, 429, { error: "Trop de tentatives, réessayez plus tard" });
    }
    const body = bodyOf(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const expectedRole = body.role === "ADMIN" ? "ADMIN" : "USER";
    if (!email || !password) return json(res, 400, { error: "Email et mot de passe requis" });
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive || !verifyPassword(password, user.passwordHash) || user.role !== expectedRole) {
        return json(res, 401, { error: "Identifiants invalides" });
      }
      const token = await createSession(user.id);
      res.setHeader("Set-Cookie", sessionCookieHeader(token, isSecureRequest(req as unknown as VercelRequest)));
      return json(res, 200, { user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error: any) {
      console.error("[auth/login]", error);
      return json(res, 500, { error: "Erreur de connexion", detail: DEBUG ? String(error?.message ?? error) : undefined });
    }
  }

  // ---------- REGISTER ----------
  if (method === "POST" && path === "register") {
    const limit = rateLimit(`register:${clientIp(req)}`);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
      return json(res, 429, { error: "Trop de tentatives, réessayez plus tard" });
    }
    const body = bodyOf(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const errors: string[] = [];
    if (!email || !email.includes("@")) errors.push("Email invalide");
    if (!name) errors.push("Le nom est requis");
    if (!password || password.length < PASSWORD_MIN) errors.push(`Le mot de passe doit faire ${PASSWORD_MIN} caractères minimum`);
    if (errors.length) return json(res, 400, { error: errors.join(" · ") });
    try {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return json(res, 409, { error: "Cet email est déjà utilisé" });
      const user = await prisma.user.create({
        data: { email, name, role: "USER", passwordHash: hashPassword(password) },
      });
      const token = await createSession(user.id);
      res.setHeader("Set-Cookie", sessionCookieHeader(token, isSecureRequest(req as unknown as VercelRequest)));
      return json(res, 201, { user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error: any) {
      console.error("[auth/register]", error);
      return json(res, 500, { error: "Erreur d'inscription", detail: DEBUG ? String(error?.message ?? error) : undefined });
    }
  }

  // ---------- LOGOUT ----------
  if (method === "POST" && path === "logout") {
    try {
      const token = ((req as any).cookies ?? {})["ic_session"] ?? "";
      if (token) await destroySession(token);
      res.setHeader("Set-Cookie", clearSessionCookieHeader());
      return json(res, 200, { ok: true, loggedOut: true });
    } catch (error: any) {
      console.error("[auth/logout]", error);
      return json(res, 500, { error: "Erreur de déconnexion", detail: DEBUG ? String(error?.message ?? error) : undefined });
    }
  }

  // ---------- SESSION ----------
  if (method === "GET" && (path === "" || path === "session")) {
    try {
      const user = await getSessionUser(req as unknown as VercelRequest);
      if (!user) return json(res, 401, { error: "Authentification requise" });
      return json(res, 200, { user });
    } catch (error: any) {
      console.error("[auth/session]", error);
      return json(res, 500, { error: "Erreur de session", detail: DEBUG ? String(error?.message ?? error) : undefined });
    }
  }

  res.statusCode = 404;
  res.end("Not found");
}
