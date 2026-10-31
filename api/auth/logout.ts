import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearSessionCookieHeader, destroySession, getSessionUser, SESSION_COOKIE } from "../../lib/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await getSessionUser(req as unknown as VercelRequest);
    const token = (req.cookies ?? {})[SESSION_COOKIE] ?? "";
    if (token) await destroySession(token);
    res.setHeader("Set-Cookie", clearSessionCookieHeader());
    return res.status(200).json({ ok: true, loggedOut: Boolean(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur de déconnexion" });
  }
}
