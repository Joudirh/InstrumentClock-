import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "ic_session";
const SESSION_TTL_DAYS = 7;

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export function parseCookies(req: { headers: Record<string, string | string[] | undefined> }): Record<string, string> {
  const header = req.headers?.cookie;
  if (!header || typeof header !== "string") return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

/** Crée un token de session en base et le renvoie (à poser en cookie HttpOnly côté handler). */
export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.userAuthToken.create({ data: { token, user_id: userId, expiresAt } });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await prisma.userAuthToken.deleteMany({ where: { token } });
}

/** Résout l'utilisateur du cookie de session, ou null (token absent/expiré). */
export async function getSessionUser(req: {
  headers: Record<string, string | string[] | undefined>;
}): Promise<AuthUser | null> {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const record = await prisma.userAuthToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!record || record.expiresAt < new Date() || !record.user.isActive) return null;
  return { id: record.user.id, email: record.user.email, name: record.user.name, role: record.user.role };
}

export function sessionCookieHeader(token: string, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_DAYS * 24 * 60 * 60}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function isSecureRequest(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const proto = req.headers["x-forwarded-proto"];
  return proto === "https" || (Array.isArray(proto) && proto.includes("https"));
}

type Statusable = {
  status: { (code: number): Statusable & { json: (data: unknown) => void } };
};

/** Garde-fou par rôle : 401 si non authentifié, 403 si rôle incorrect. */
export async function requireRole(
  req: { headers: Record<string, string | string[] | undefined> },
  res: Statusable,
  role: "ADMIN" | "USER"
): Promise<AuthUser | null> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentification requise" });
    return null;
  }
  if (user.role !== role) {
    res.status(403).json({ error: "Accès refusé" });
    return null;
  }
  return user;
}
