import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser } from "../../lib/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getSessionUser(req as unknown as VercelRequest);
    if (!user) return res.status(401).json({ error: "Authentification requise" });
    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur de session" });
  }
}
