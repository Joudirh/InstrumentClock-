import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { requireRole } from "../lib/session.js";
import { parseAcademyMarkdown, type ParsedAcademyCourse } from "../lib/academy-import.js";
import { ACADEMY_CATALOG, academyCatalogEntry } from "../lib/academy-catalog.js";
import {
  generateAcademyPart,
  type AcademyGenerationPart,
  type AcademyGenerationRepair,
} from "../lib/academy-generation.js";
import {
  deriveLegacyColumns,
  slugify,
  supportedTimezones,
  uniqueSlug,
  validateWindows,
  type WindowInput,
} from "../lib/admin-data.js";

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

function badRequest(res: VercelResponse, errors: string[]) {
  return json(res, 400, { error: errors.join(" · ") });
}

const ACADEMY_LEVELS = new Set(["Débutant", "Intermédiaire", "Avancé", "Expert"]);

async function saveAcademyDraft(markdown: string, course: ParsedAcademyCourse) {
  const [byCode, bySlug] = await Promise.all([
    prisma.academyCourse.findUnique({ where: { code: course.code } }),
    prisma.academyCourse.findUnique({ where: { slug: course.slug } }),
  ]);
  if (byCode && bySlug && byCode.id !== bySlug.id) {
    return { error: "Le code et le slug correspondent à deux cours différents." };
  }
  const existing = byCode || bySlug;
  if (existing?.status === "PUBLISHED") {
    return { error: "Ce cours est déjà publié et ne peut pas être remplacé." };
  }
  if (
    existing &&
    (existing.code !== course.code || (existing.slug !== course.slug && existing.status !== "EMPTY"))
  ) {
    return { error: "Le code et le slug du cours doivent rester identiques." };
  }

  const data = {
    slug: course.slug,
    title: course.title,
    domain: course.domain,
    path: course.path,
    level: course.level,
    summary: course.summary,
    objectives: course.objectives,
    content: {
      modules: course.modules,
      exam: course.exam,
      estimatedMinutes: course.estimatedMinutes,
    },
    sourceMarkdown: markdown,
    status: "DRAFT" as const,
    verifiedById: null,
    publishedAt: null,
  };
  const saved = existing
    ? await prisma.academyCourse.update({
        where: { id: existing.id },
        data: { ...data, version: { increment: 1 } },
      })
    : await prisma.academyCourse.create({
        data: { ...data, code: course.code, slug: course.slug },
      });
  return { saved };
}

async function academyGenerationInput(
  body: Record<string, unknown>,
  res: VercelResponse,
  requireApiKey = true,
) {
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const entry = academyCatalogEntry(code);
  const existing = code ? await prisma.academyCourse.findUnique({ where: { code } }) : null;
  if (!entry && !existing) {
    badRequest(res, ["Cours inconnu"]);
    return null;
  }
  if (existing?.status === "DRAFT") {
    json(res, 409, { error: "Ce cours a déjà un brouillon. Modifiez-le ou supprimez-le avant d’en générer un autre." });
    return null;
  }
  if (existing?.status === "PUBLISHED") {
    json(res, 409, { error: "Ce cours est déjà publié." });
    return null;
  }

  const title = typeof body.title === "string" ? body.title.trim() : existing?.title ?? entry!.title;
  const level = typeof body.level === "string" ? body.level.trim() : existing?.level ?? entry!.level;
  const instructions = typeof body.instructions === "string" ? body.instructions : "";
  if (!title || title.length > 160) {
    badRequest(res, ["Le titre doit contenir de 1 à 160 caractères."]);
    return null;
  }
  if (!ACADEMY_LEVELS.has(level)) {
    badRequest(res, ["Le niveau du cours est invalide."]);
    return null;
  }
  if (instructions.length > 2_000) {
    badRequest(res, ["Les consignes complémentaires ne peuvent pas dépasser 2 000 caractères."]);
    return null;
  }
  if (requireApiKey && !process.env.GEMINI_API_KEY?.trim()) {
    json(res, 503, { error: "Clé Gemini manquante. Configurez GEMINI_API_KEY côté serveur." });
    return null;
  }

  return {
    code,
    title,
    level,
    instructions,
    slug: slugify(`${code}-${title}`),
    courseEntry: { ...(entry ?? existing!), title, level },
  };
}

const PASSWORD_MIN = 8;

function publicUser(u: { id: number; email: string; name: string; role: string; isActive: boolean; createdAt: Date }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.isActive, createdAt: u.createdAt };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireRole(req, res, "ADMIN");
  if (!admin) return;

  const path = pathOf(req);
  const method = req.method;

  // ================= TRADING ACADEMY =================
  if (path === "academy") {
    if (method === "GET") {
      const requestedId = req.query.id === undefined ? null : Number(req.query.id);
      if (requestedId !== null) {
        if (!Number.isInteger(requestedId) || requestedId < 1) return badRequest(res, ["Identifiant du cours invalide"]);
        const course = await prisma.academyCourse.findUnique({
          where: { id: requestedId },
          include: { verifiedBy: { select: { name: true } } },
        });
        if (!course) return json(res, 404, { error: "Cours introuvable" });
        res.setHeader("Cache-Control", "no-store");
        return json(res, 200, { course });
      }
      const requestedCode = typeof req.query.code === "string" ? req.query.code.trim() : "";
      if (requestedCode) {
        const [catalogEntry, saved] = await Promise.all([
          Promise.resolve(academyCatalogEntry(requestedCode)),
          prisma.academyCourse.findUnique({
            where: { code: requestedCode },
            include: { verifiedBy: { select: { name: true } } },
          }),
        ]);
        if (!catalogEntry && !saved) return json(res, 404, { error: "Cours introuvable" });
        const course = saved ?? {
          id: null,
          ...catalogEntry!,
          slug: slugify(`${catalogEntry!.code}-${catalogEntry!.title}`),
          summary: "",
          objectives: [],
          content: { modules: [], exam: [], estimatedMinutes: 0 },
          sourceMarkdown: "",
          status: "EMPTY" as const,
          version: 0,
          updatedAt: null,
          publishedAt: null,
          verifiedById: null,
          verifiedBy: null,
        };
        res.setHeader("Cache-Control", "no-store");
        return json(res, 200, { course });
      }

      const savedCourses = await prisma.academyCourse.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          code: true,
          slug: true,
          title: true,
          domain: true,
          path: true,
          level: true,
          status: true,
          version: true,
          updatedAt: true,
          publishedAt: true,
          verifiedBy: { select: { name: true } },
        },
      });
      const savedByCode = new Map(savedCourses.map((course) => [course.code, course]));
      const catalogCodes = new Set(ACADEMY_CATALOG.map((course) => course.code));
      const courses = ACADEMY_CATALOG.map((entry) => savedByCode.get(entry.code) ?? {
        id: null,
        ...entry,
        slug: slugify(`${entry.code}-${entry.title}`),
        status: "EMPTY" as const,
        version: 0,
        updatedAt: null,
        publishedAt: null,
        verifiedBy: null,
      });
      courses.push(...savedCourses.filter((course) => !catalogCodes.has(course.code)));
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { courses });
    }

    if (method === "POST") {
      const body = bodyOf(req);
      if (body.action === "generate-part") {
        const input = await academyGenerationInput(body, res);
        if (!input) return;
        const partValue = body.part;
        if (typeof partValue !== "object" || partValue === null) {
          return badRequest(res, ["Section de génération invalide."]);
        }
        const partBody = partValue as Record<string, unknown>;
        if (
          (partBody.type !== "module" && partBody.type !== "exam") ||
          typeof partBody.index !== "number" ||
          !Number.isInteger(partBody.index)
        ) {
          return badRequest(res, ["Section de génération invalide."]);
        }
        const part: AcademyGenerationPart = { type: partBody.type, index: partBody.index };
        let repair: AcademyGenerationRepair | undefined;
        if (body.repair !== undefined) {
          if (typeof body.repair !== "object" || body.repair === null) {
            return badRequest(res, ["Données de correction invalides."]);
          }
          const repairBody = body.repair as Record<string, unknown>;
          if (
            typeof repairBody.previousText !== "string" ||
            repairBody.previousText.length > 64 * 1024 ||
            !Array.isArray(repairBody.errors) ||
            repairBody.errors.length < 1 ||
            repairBody.errors.length > 20 ||
            repairBody.errors.some((error) => typeof error !== "string" || error.length > 500)
          ) {
            return badRequest(res, ["Données de correction invalides."]);
          }
          const errors = repairBody.errors.filter((error): error is string => typeof error === "string");
          repair = {
            previousText: repairBody.previousText,
            errors,
          };
        }
        let text: string;
        try {
          text = await generateAcademyPart(input.courseEntry, input.instructions, input.slug, part, repair);
        } catch (error) {
          return json(res, 502, {
            error: error instanceof Error ? error.message : "La génération du cours a échoué.",
          });
        }
        return json(res, 200, { text });
      }

      if (body.action === "save-generated") {
        const input = await academyGenerationInput(body, res, false);
        if (!input) return;
        const markdown = typeof body.markdown === "string" ? body.markdown : "";
        const parsed = parseAcademyMarkdown(markdown);
        if (!parsed.ok) {
          return json(res, 422, {
            error: "Gemini n’a pas produit un cours conforme. Réessayez la génération.",
            errors: parsed.errors,
          });
        }
        if (
          parsed.course.code !== input.code ||
          parsed.course.slug !== input.slug ||
          parsed.course.title !== input.title ||
          parsed.course.level !== input.level ||
          parsed.course.domain !== input.courseEntry.domain ||
          parsed.course.path !== input.courseEntry.path
        ) {
          return json(res, 422, {
            error: "Les métadonnées générées ne correspondent pas au cours demandé.",
          });
        }

        const saved = await saveAcademyDraft(markdown, parsed.course);
        if ("error" in saved) return json(res, 409, { error: saved.error });
        return json(res, 201, {
          course: { id: saved.saved.id, code: saved.saved.code, title: saved.saved.title, status: saved.saved.status },
          sourceMarkdown: markdown,
        });
      }

      if (body.action === "edit-empty") {
        const code = typeof body.code === "string" ? body.code.trim() : "";
        const entry = academyCatalogEntry(code);
        if (!entry) return badRequest(res, ["Cours inconnu"]);
        const existing = await prisma.academyCourse.findUnique({ where: { code } });
        if (existing && existing.status !== "EMPTY") {
          return json(res, 409, { error: "Seul un cours vide peut être modifié ici." });
        }
        const title = typeof body.title === "string" ? body.title.trim() : "";
        const level = typeof body.level === "string" ? body.level.trim() : "";
        if (!title || title.length > 160) return badRequest(res, ["Le titre doit contenir de 1 à 160 caractères."]);
        if (!ACADEMY_LEVELS.has(level)) return badRequest(res, ["Le niveau du cours est invalide."]);
        const slug = slugify(`${code}-${title}`);
        const saved = existing
          ? await prisma.academyCourse.update({ where: { id: existing.id }, data: { title, level, slug } })
          : await prisma.academyCourse.create({
              data: {
                code,
                slug,
                title,
                domain: entry.domain,
                path: entry.path,
                level,
                summary: "",
                objectives: [],
                content: { modules: [], exam: [], estimatedMinutes: 0 },
                sourceMarkdown: "",
                status: "EMPTY",
              },
            });
        return json(res, 200, { course: { id: saved.id, code: saved.code, title: saved.title, level: saved.level, status: saved.status } });
      }

      if (body.action === "edit-draft") {
        const id = Number(body.id);
        if (!Number.isInteger(id) || id < 1) return badRequest(res, ["Identifiant du brouillon invalide"]);
        const existing = await prisma.academyCourse.findUnique({ where: { id } });
        if (!existing || existing.status !== "DRAFT") return json(res, 404, { error: "Brouillon introuvable ou déjà publié." });
        const parsed = parseAcademyMarkdown(body.markdown);
        if (!parsed.ok) return json(res, 400, { error: parsed.errors.join(" · "), errors: parsed.errors });
        if (parsed.course.code !== existing.code || parsed.course.slug !== existing.slug) {
          return json(res, 409, { error: "Le code et le slug ne peuvent pas être modifiés dans un brouillon." });
        }
        const saved = await saveAcademyDraft(String(body.markdown), parsed.course);
        if ("error" in saved) return json(res, 409, { error: saved.error });
        return json(res, 200, { course: { id: saved.saved.id, status: saved.saved.status, version: saved.saved.version } });
      }

      if (body.action === "publish") {
        if (body.verified !== true) return badRequest(res, ["La confirmation de relecture et de vérification est obligatoire."]);
        const id = Number(body.id);
        if (!Number.isInteger(id) || id < 1) return badRequest(res, ["Identifiant du brouillon invalide"]);
        const draft = await prisma.academyCourse.findUnique({ where: { id } });
        if (!draft) return json(res, 404, { error: "Cours introuvable" });
        if (draft.status !== "DRAFT") return json(res, 409, { error: "Seul un brouillon peut être publié." });
        const parsed = parseAcademyMarkdown(draft.sourceMarkdown);
        if (!parsed.ok) return json(res, 400, { error: parsed.errors.join(" · "), errors: parsed.errors });
        if (parsed.course.code !== draft.code || parsed.course.slug !== draft.slug) {
          return json(res, 409, { error: "Le code ou le slug du brouillon ne correspond plus à son enregistrement." });
        }
        const published = await prisma.academyCourse.updateMany({
          where: { id, status: "DRAFT", updatedAt: draft.updatedAt },
          data: { status: "PUBLISHED", verifiedById: admin.id, publishedAt: new Date() },
        });
        if (published.count !== 1) return json(res, 409, { error: "Le brouillon a été modifié. Rechargez la liste avant de publier." });
        return json(res, 200, { ok: true, id, status: "PUBLISHED", verifiedBy: admin.name });
      }

      if (body.action === "delete-draft") {
        const id = Number(body.id);
        if (!Number.isInteger(id) || id < 1) return badRequest(res, ["Identifiant du brouillon invalide"]);
        const deleted = await prisma.academyCourse.deleteMany({ where: { id, status: "DRAFT" } });
        if (deleted.count !== 1) return json(res, 404, { error: "Brouillon introuvable ou déjà publié." });
        return json(res, 200, { ok: true });
      }

      if (body.action === "reset-empty") {
        const code = typeof body.code === "string" ? body.code.trim() : "";
        if (!academyCatalogEntry(code)) return badRequest(res, ["Cours inconnu"]);
        const existing = await prisma.academyCourse.findUnique({ where: { code } });
        if (existing && existing.status !== "EMPTY") {
          return json(res, 409, { error: "Seul un cours vide peut être réinitialisé." });
        }
        if (existing) await prisma.academyCourse.delete({ where: { id: existing.id } });
        return json(res, 200, { ok: true });
      }

      return badRequest(res, ["Action invalide"]);
    }

    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST");
    return res.end("Method not allowed");
  }

  // ================= USERS =================
  if (path === "users") {
    if (method === "GET") {
      const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
      return json(res, 200, { users: users.map(publicUser) });
    }
    if (method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const role = body.role === "ADMIN" ? "ADMIN" : "USER";
      if (!email || !email.includes("@")) errors.push("Email invalide");
      if (!name) errors.push("Le nom est requis");
      if (password.length < PASSWORD_MIN) errors.push(`Le mot de passe doit faire ${PASSWORD_MIN} caractères minimum`);
      if (errors.length) return badRequest(res, errors);
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return badRequest(res, ["Cet email est déjà utilisé"]);
      const user = await prisma.user.create({ data: { email, name, role, passwordHash: hashPassword(password) } });
      return json(res, 201, { user: publicUser(user) });
    }
    if (method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return json(res, 404, { error: "Utilisateur introuvable" });
      const body = bodyOf(req);
      const errors: string[] = [];
      const data: { email?: string; name?: string; role?: "ADMIN" | "USER"; isActive?: boolean; passwordHash?: string } = {};
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
      if (body.role === "ADMIN" || body.role === "USER") {
        if (target.role === "ADMIN" && target.isActive && body.role === "USER") {
          const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
          if (otherAdmins === 0) errors.push("Impossible de retirer le dernier administrateur actif");
          else data.role = body.role;
        } else {
          data.role = body.role;
        }
      }
      if (typeof body.isActive === "boolean" && body.isActive !== target.isActive) {
        if (target.role === "ADMIN" && !body.isActive) {
          const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
          if (otherAdmins === 0) errors.push("Impossible de désactiver le dernier administrateur actif");
          else data.isActive = body.isActive;
        } else {
          data.isActive = body.isActive;
        }
      }
      const password = typeof body.password === "string" ? body.password : "";
      if (password) {
        if (password.length < PASSWORD_MIN) errors.push(`Le mot de passe doit faire ${PASSWORD_MIN} caractères minimum`);
        else data.passwordHash = hashPassword(password);
      }
      if (errors.length) return badRequest(res, errors);
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data });
        if (data.passwordHash || data.isActive === false) {
          await tx.userAuthToken.deleteMany({ where: { user_id: id } });
        }
      });
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      return json(res, 200, { user: publicUser(user) });
    }
    if (method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      if (id === admin.id) return badRequest(res, ["Vous ne pouvez pas supprimer votre propre compte"]);
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return json(res, 404, { error: "Utilisateur introuvable" });
      if (target.role === "ADMIN" && target.isActive) {
        const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
        if (otherAdmins === 0) return badRequest(res, ["Impossible de supprimer le dernier administrateur actif"]);
      }
      await prisma.user.delete({ where: { id } });
      return json(res, 200, { ok: true });
    }
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.end("Method not allowed");
  }

  // ================= OVERVIEW =================
  if (path === "overview" && method === "GET") {
    try {
      const [users, sessions, categories, instruments, windows, assets, forexSessions, seasons] = await Promise.all([
        prisma.user.count(),
        prisma.session.count(),
        prisma.category.count(),
        prisma.instrument.count(),
        prisma.instrumentWindow.count(),
        prisma.asset.count(),
        prisma.forexSession.count(),
        prisma.season.count(),
      ]);
      const recent = await prisma.instrument.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { category: true, session: true },
      });
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { stats: { users, sessions, categories, instruments, windows, assets, forexSessions, seasons }, recent });
    } catch {
      return json(res, 500, { error: "Erreur interne" });
    }
  }

  // ================= CATEGORIES =================
  if (path === "categories") {
    if (method === "GET") {
      const categories = await prisma.category.findMany({
        orderBy: { position: "asc" },
        include: { _count: { select: { instruments: true } } },
      });
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { categories });
    }
    if (method === "POST") {
      const body = bodyOf(req);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const position = Number(body.position ?? 0);
      if (!name) return badRequest(res, ["Le nom est requis"]);
      const slug = await uniqueSlug(typeof body.slug === "string" && body.slug ? body.slug : name, (candidate) =>
        prisma.category.findUnique({ where: { slug: candidate } }).then(Boolean)
      );
      const category = await prisma.category.create({ data: { name, slug, position: Number.isInteger(position) ? position : 0 } });
      return json(res, 201, { category });
    }
    if (method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.category.findUnique({ where: { id } });
      if (!existing) return json(res, 404, { error: "Catégorie introuvable" });
      const body = bodyOf(req);
      const data: { name?: string; position?: number } = {};
      if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
      if (body.position !== undefined && Number.isInteger(Number(body.position))) data.position = Number(body.position);
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);
      const category = await prisma.category.update({ where: { id }, data });
      return json(res, 200, { category });
    }
    if (method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { instruments: true } } } });
      if (!existing) return json(res, 404, { error: "Catégorie introuvable" });
      if (existing._count.instruments > 0) {
        return badRequest(res, [`${existing._count.instruments} instrument(s) rattaché(s) : déplacez-les avant de supprimer la catégorie`]);
      }
      await prisma.category.delete({ where: { id } });
      return json(res, 200, { ok: true });
    }
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.end("Method not allowed");
  }

  // ================= SESSIONS =================
  if (path === "sessions") {
    const timezones = supportedTimezones();
    const REGIONS = ["ASIA", "EUROPE", "AMERICA", "OCEANIA", "AFRICA", "GLOBAL"];
    if (method === "GET") {
      const sessions = await prisma.session.findMany({
        orderBy: { position: "asc" },
        include: { _count: { select: { instruments: true } } },
      });
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { sessions });
    }
    if (method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const region = typeof body.region === "string" && REGIONS.includes(body.region) ? body.region : "";
      const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
      if (!name) errors.push("Le nom est requis");
      if (!region) errors.push("Région invalide");
      if (!timezone || (!timezones.has(timezone) && timezone !== "UTC")) errors.push(`Fuseau horaire inconnu ${timezone}`);
      if (errors.length) return badRequest(res, errors);
      const slug = await uniqueSlug(typeof body.slug === "string" && body.slug.trim() ? body.slug : name, (candidate) =>
        prisma.session.findUnique({ where: { slug: candidate } }).then(Boolean)
      );
      const session = await prisma.session.create({
        data: { name, slug, region: region as never, timezone, is247: body.is247 === true, flag: typeof body.flag === "string" ? body.flag.trim() : null, color: typeof body.color === "string" ? body.color.trim() : null, position: Number.isInteger(Number(body.position)) ? Number(body.position) : 0 },
      });
      return json(res, 201, { session });
    }
    if (method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.session.findUnique({ where: { id } });
      if (!existing) return json(res, 404, { error: "Séance introuvable" });
      const body = bodyOf(req);
      const errors: string[] = [];
      const data: Record<string, unknown> = {};
      if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
      if (typeof body.region === "string" && REGIONS.includes(body.region)) data.region = body.region;
      if (typeof body.timezone === "string" && body.timezone.trim()) {
        const tz = body.timezone.trim();
        if (!timezones.has(tz) && tz !== "UTC") errors.push(`Fuseau horaire inconnu ${tz}`);
        else data.timezone = tz;
      }
      if (typeof body.is247 === "boolean") {
        if (existing.is247 && !body.is247) {
          const attached = await prisma.instrument.count({ where: { session: { id }, is247: true } });
          if (attached > 0) errors.push("Des instruments 24/7 rattachés : marquez-les avant de désactiver cette séance");
        }
        data.is247 = body.is247;
      }
      if (typeof body.flag === "string") data.flag = body.flag.trim() || null;
      if (typeof body.color === "string") data.color = body.color.trim() || null;
      if (body.position !== undefined && Number.isInteger(Number(body.position))) data.position = Number(body.position);
      if (errors.length) return badRequest(res, errors);
      if (Object.keys(data).length === 0) return badRequest(res, ["Aucune modification"]);
      const session = await prisma.session.update({ where: { id }, data });
      return json(res, 200, { session });
    }
    if (method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.session.findUnique({ where: { id }, include: { _count: { select: { instruments: true } } } });
      if (!existing) return json(res, 404, { error: "Séance introuvable" });
      if (existing._count.instruments > 0) {
        return badRequest(res, [`${existing._count.instruments} instrument(s) rattaché(s) : déplacez-les avant de supprimer la séance`]);
      }
      await prisma.session.delete({ where: { id } });
      return json(res, 200, { ok: true });
    }
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.end("Method not allowed");
  }

  // ================= INSTRUMENTS =================
  if (path === "instruments") {
    const timezones = supportedTimezones();
    if (method === "GET") {
      const [instruments, sessions, categories] = await Promise.all([
        prisma.instrument.findMany({ orderBy: { name: "asc" }, include: { session: true, category: true, windows: { orderBy: [{ kind: "asc" }, { position: "asc" }] } } }),
        prisma.session.findMany({ orderBy: { position: "asc" } }),
        prisma.category.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { instruments: true } } } }),
      ]);
      res.setHeader("Cache-Control", "no-store");
      return json(res, 200, { instruments, sessions, categories });
    }
    if (method === "POST") {
      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) errors.push("Le nom est requis");
      const categoryId = Number(body.categoryId);
      const sessionId = Number(body.sessionId);
      if (!Number.isInteger(categoryId) || !Number.isInteger(sessionId)) errors.push("Catégorie et séance obligatoires");
      const description = typeof body.description === "string" ? body.description.trim() : null;
      const check = validateWindows(body.windows, timezones);
      if (!check.ok) return badRequest(res, check.errors);
      if (errors.length) return badRequest(res, errors);
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return badRequest(res, ["Séance inconnue"]);
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return badRequest(res, ["Catégorie inconnue"]);
      const slug = await uniqueSlug(name, (candidate) => prisma.instrument.findUnique({ where: { slug: candidate } }).then(Boolean));
      const is247 = session.is247;
      const created = await prisma.$transaction(async (tx) => {
        const instrument = await tx.instrument.create({ data: { name, slug, description, categoryId, sessionId, ...deriveLegacyColumns(check.windows as WindowInput[], is247) } });
        await tx.instrumentWindow.createMany({ data: (check.windows as WindowInput[]).map((w, position) => ({ instrumentId: instrument.id, ...w, position })) });
        return instrument;
      });
      return json(res, 201, { instrument: created });
    }
    if (method === "PUT") {
      const id = Number(req.query.id ?? bodyOf(req).id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.instrument.findUnique({ where: { id }, include: { session: true } });
      if (!existing) return json(res, 404, { error: "Instrument introuvable" });
      const body = bodyOf(req);
      const errors: string[] = [];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) errors.push("Le nom est requis");
      const categoryId = Number(body.categoryId);
      const sessionId = Number(body.sessionId);
      if (!Number.isInteger(categoryId) || !Number.isInteger(sessionId)) errors.push("Catégorie et séance obligatoires");
      if (errors.length) return badRequest(res, errors);
      const description = typeof body.description === "string" ? body.description.trim() : null;
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return badRequest(res, ["Séance inconnue"]);
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return badRequest(res, ["Catégorie inconnue"]);
      const check = validateWindows(body.windows, timezones);
      if (!check.ok) return badRequest(res, check.errors);
      let slug = existing.slug;
      if (slugify(name) !== slugify(existing.name)) {
        slug = await uniqueSlug(name, (candidate) => prisma.instrument.findUnique({ where: { slug: candidate } }).then((row) => Boolean(row && row.id !== id)));
      }
      const windows = check.windows as WindowInput[];
      await prisma.$transaction(async (tx) => {
        await tx.instrument.update({ where: { id }, data: { name, slug, description, categoryId, sessionId, ...deriveLegacyColumns(windows, session.is247) } });
        await tx.instrumentWindow.deleteMany({ where: { instrumentId: id } });
        await tx.instrumentWindow.createMany({ data: windows.map((w, position) => ({ instrumentId: id, ...w, position })) });
      });
      const updated = await prisma.instrument.findUnique({ where: { id } });
      return json(res, 200, { instrument: updated });
    }
    if (method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return badRequest(res, ["id requis"]);
      const existing = await prisma.instrument.findUnique({ where: { id } });
      if (!existing) return json(res, 404, { error: "Instrument introuvable" });
      await prisma.instrument.delete({ where: { id } });
      return json(res, 200, { ok: true, deleted: existing.id });
    }
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.end("Method not allowed");
  }

  res.statusCode = 404;
  res.end("Not found");
}
