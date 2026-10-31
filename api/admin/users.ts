import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/password";
import { requireAuth } from "../../lib/session";

function bodyOf(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
}

function badRequest(res: VercelResponse, errors: string[]) {
  return res.status(400).json({ error: errors.join(" · ") });
}

function publicUser(u: { id: number; email: string; name: string; role: string; isActive: boolean; createdAt: Date }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.isActive, createdAt: u.createdAt };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAuth(req, res);
  if (!admin) return;

  try {
    if (req.method === "GET") {
      const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
      return res.setHeader("Cache-Control", "no-store").status(200).json({ users: users.map(publicUser) });
    }

    if (req.method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const role = body.role === "ADMIN" ? "ADMIN" : "EDITOR";
      if (!email || !email.includes("@")) errors.push("Email invalide");
      if (!name) errors.push("Le nom est requis");
      if (password.length < 6) errors.push("Le mot de passe doit faire 6 caractères minimum");
      if (errors.length) return badRequest(res, errors);
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return badRequest(res, ["Cet email est déjà utilisé"]);
      const user = await prisma.user.create({
        data: { email, name, role, passwordHash: hashPassword(password) },
      });
      return res.status(201).json({ user: publicUser(user) });
    }

    if (req.method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return res.status(404).json({ error: "Utilisateur introuvable" });

      const body = bodyOf(req);
      const errors: string[] = [];
      const data: {
        email?: string;
        name?: string;
        role?: "ADMIN" | "EDITOR";
        isActive?: boolean;
        passwordHash?: string;
      } = {};

      if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
      if (typeof body.email === "string" && body.email.trim().toLowerCase() !== target.email) {
        const email = body.email.trim().toLowerCase();
        if (!email.includes("@")) errors.push("Email invalide");
        else {
          const taken = await prisma.user.findUnique({ where: { email } });
          if (taken && taken.id !== id) errors.push("Cet email est déjà utilisé");
          else data.email = email;
        }
      }
      if (body.role === "ADMIN" || body.role === "EDITOR") {
        // Interdit de retirer le dernier administrateur actif.
        if (target.role === "ADMIN" && target.isActive && body.role === "EDITOR") {
          const otherAdmins = await prisma.user.count({
            where: { role: "ADMIN", isActive: true, id: { not: id } },
          });
          if (otherAdmins === 0) errors.push("Impossible de retirer le dernier administrateur actif");
          else data.role = body.role;
        } else {
          data.role = body.role;
        }
      }
      if (typeof body.isActive === "boolean" && body.isActive !== target.isActive) {
        if (target.role === "ADMIN" && !body.isActive) {
          const otherAdmins = await prisma.user.count({
            where: { role: "ADMIN", isActive: true, id: { not: id } },
          });
          if (otherAdmins === 0) errors.push("Impossible de désactiver le dernier administrateur actif");
          else data.isActive = body.isActive;
        } else {
          data.isActive = body.isActive;
        }
      }
      const password = typeof body.password === "string" ? body.password : "";
      if (password) {
        if (password.length < 6) errors.push("Le mot de passe doit faire 6 caractères minimum");
        else data.passwordHash = hashPassword(password);
      }
      if (errors.length) return badRequest(res, errors);
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);

      // Une réinitialisation de mot de passe invalide les sessions existantes.
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data });
        if (data.passwordHash || data.isActive === false) {
          await tx.userAuthToken.deleteMany({ where: { user_id: id } });
        }
      });
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      return res.status(200).json({ user: publicUser(user) });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      if (id === admin.id) return badRequest(res, ["Vous ne pouvez pas supprimer votre propre compte"]);
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return res.status(404).json({ error: "Utilisateur introuvable" });
      if (target.role === "ADMIN" && target.isActive) {
        const otherAdmins = await prisma.user.count({
          where: { role: "ADMIN", isActive: true, id: { not: id } },
        });
        if (otherAdmins === 0) return badRequest(res, ["Impossible de supprimer le dernier administrateur actif"]);
      }
      await prisma.user.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
