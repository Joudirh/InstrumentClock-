import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../lib/prisma.js";
import { parseAcademyMarkdown } from "../lib/academy-import.js";

function json(res: VercelResponse, code: number, data: unknown) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Méthode non autorisée" });
  }

  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  if (slug) {
    const course = await prisma.academyCourse.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { sourceMarkdown: true, publishedAt: true, version: true },
    });
    if (!course) return json(res, 404, { error: "Cours publié introuvable" });
    const parsed = parseAcademyMarkdown(course.sourceMarkdown);
    if (!parsed.ok) {
      console.error("[academy] Published course failed validation", { slug, errors: parsed.errors });
      return json(res, 500, { error: "Le contenu publié ne passe plus la validation. Contactez un administrateur." });
    }

    return json(res, 200, {
      course: {
        code: parsed.course.code,
        slug: parsed.course.slug,
        title: parsed.course.title,
        domain: parsed.course.domain,
        path: parsed.course.path,
        level: parsed.course.level,
        summary: parsed.course.summary,
        objectives: parsed.course.objectives,
        estimatedMinutes: parsed.course.estimatedMinutes,
        modules: parsed.course.modules.map((module) => ({
          title: module.title,
          lessons: module.lessons,
        })),
        publishedAt: course.publishedAt,
        version: course.version,
      },
    });
  }

  const courses = await prisma.academyCourse.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ domain: "asc" }, { path: "asc" }, { code: "asc" }],
    select: {
      code: true,
      slug: true,
      title: true,
      domain: true,
      path: true,
      level: true,
      summary: true,
      content: true,
      publishedAt: true,
      version: true,
    },
  });

  return json(res, 200, {
    courses: courses.map((course) => {
      const content = typeof course.content === "object" && course.content !== null && !Array.isArray(course.content)
        ? course.content
        : {};
      const estimatedMinutes = "estimatedMinutes" in content && typeof content.estimatedMinutes === "number"
        ? content.estimatedMinutes
        : null;
      return {
        code: course.code,
        slug: course.slug,
        title: course.title,
        domain: course.domain,
        path: course.path,
        level: course.level,
        summary: course.summary,
        estimatedMinutes,
        publishedAt: course.publishedAt,
        version: course.version,
      };
    }),
  });
}
