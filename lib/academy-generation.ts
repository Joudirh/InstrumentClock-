import type { AcademyCatalogEntry } from "./academy-catalog.js";
import { parseAcademyMarkdown, type ParsedAcademyCourse } from "./academy-import.js";

const MAX_INSTRUCTIONS_LENGTH = 2_000;
const GENERATION_TIMEOUT_MS = 24_000;

function promptForCourse(
 course: AcademyCatalogEntry,
 slug: string,
 instructions: string,
 previousMarkdown?: string,
 validationErrors: string[] = [],
): string {
 const repairInstructions = previousMarkdown
   ? `\n\nLa version précédente ne passe pas la validation. Corrige-la impérativement en tenant compte de CHAQUE erreur :
${validationErrors.map((error) => `- ${error}`).join("\n")}

Réponds avec le cours complet corrigé, pas avec un résumé ni uniquement les parties manquantes. La version précédente à corriger est :
<cours_precedent>
${previousMarkdown}
</cours_precedent>`
   : "";

 return `Tu es concepteur pédagogique spécialisé en éducation financière. Rédige en français un cours complet, rigoureux, neutre et adapté au niveau ${course.level}.

Métadonnées à respecter exactement :
code: ${course.code}
slug: ${slug}
title: ${course.title}
domain: ${course.domain}
path: ${course.path}
level: ${course.level}

Consignes pédagogiques supplémentaires de l’administrateur :
${instructions || "Aucune. Construis le cours autour du titre et des objectifs pédagogiques appropriés."}

Retourne uniquement le Markdown final, sans bloc de code ni commentaire autour. Respecte les intitulés, niveaux de titres et volumes ci-dessous. Les titres et nombres sont importants car un validateur automatique les lit.

1. En-tête YAML entre deux lignes --- avec code, slug, title, domain, path, level, summary (30 à 500 caractères) et objectives (au moins 2 éléments).
2. Écris exactement 4 modules, numérotés de 1 à 4, avec les titres sous la forme « ## Module 1 — Titre ».
3. Dans CHAQUE module, écris exactement 3 leçons. Chaque titre doit être une ligne au niveau H3, sous cette forme exacte : « ### Leçon 1 — Titre (8 min) ». Numérote les leçons de 1 à 3 dans chaque module. Chaque leçon dure de 5 à 12 minutes et contient au moins 80 caractères utiles, avec explication, exemple concret et limites. Utilise 8 minutes par leçon afin d’assurer 96 minutes au total.
4. Après les 3 leçons de CHAQUE module, écris exactement « ### Quiz du module », puis au moins 8 questions.
5. Termine par exactement « ## Examen final » puis au moins 30 questions.
6. Chaque question a un titre H4 de la forme « #### Question 1 — Question complète ? », au moins 3 choix sur des lignes « - [ ] Choix » ou « - [x] Choix », exactement un choix [x], puis une ligne « Explication : texte de plus de 20 caractères ».
7. Explique clairement tout exercice pratique. Reste éducatif, mentionne les risques, ne promets aucun gain et ne recommande aucun investissement.

Format exact d’une question :
#### Question 1 — Question complète ?
- [ ] Une réponse incorrecte plausible
- [x] La réponse correcte
- [ ] Une autre réponse incorrecte plausible

Explication : Justification pédagogique claire de la réponse correcte.${repairInstructions}`;
}

export async function generateAcademyMarkdown(
  course: AcademyCatalogEntry,
  rawInstructions: string,
  slug: string,
  repair?: { previousMarkdown: string; validationErrors: string[] },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Clé Gemini manquante. Configurez GEMINI_API_KEY dans .env ou dans les variables Vercel.");
  }

  const instructions = rawInstructions.trim();
  if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    throw new Error(`Les consignes supplémentaires ne peuvent pas dépasser ${MAX_INSTRUCTIONS_LENGTH} caractères.`);
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new Error("La configuration GEMINI_MODEL est invalide.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptForCourse(
                course,
                slug,
                instructions,
                repair?.previousMarkdown,
                repair?.validationErrors,
              ),
            }],
          }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 24_000 },
        }),
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini a dépassé le délai de génération. Réessayez.");
    }
    throw new Error("Connexion à Gemini impossible. Vérifiez la configuration réseau et réessayez.");
  } finally {
    clearTimeout(timeout);
  }

  let result: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    error?: { message?: string };
  };
  try {
    result = await response.json() as typeof result;
  } catch {
    throw new Error("Gemini a renvoyé une réponse illisible.");
  }
  if (!response.ok) {
    const message = result.error?.message;
    throw new Error(message ? `Gemini a refusé la génération : ${message}` : `Gemini a renvoyé une erreur HTTP ${response.status}.`);
  }

  const candidate = result.candidates?.[0];
  const markdown = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!markdown) {
    throw new Error(`Gemini n’a renvoyé aucun contenu${candidate?.finishReason ? ` (${candidate.finishReason})` : ""}.`);
  }
  return markdown.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function generateValidatedAcademyCourse(
  course: AcademyCatalogEntry,
  instructions: string,
  slug: string,
): Promise<
  | { ok: true; markdown: string; course: ParsedAcademyCourse }
  | { ok: false; errors: string[] }
> {
  let markdown = "";
  let validationErrors: string[] = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    markdown = await generateAcademyMarkdown(
      course,
      instructions,
      slug,
      attempt === 1 ? { previousMarkdown: markdown, validationErrors } : undefined,
    );

    const parsed = parseAcademyMarkdown(markdown);
    validationErrors = parsed.ok ? [] : parsed.errors;
    if (parsed.ok) {
      if (
        parsed.course.code !== course.code ||
        parsed.course.slug !== slug ||
        parsed.course.title !== course.title ||
        parsed.course.domain !== course.domain ||
        parsed.course.path !== course.path ||
        parsed.course.level !== course.level
      ) {
        validationErrors = ["Les métadonnées du cours doivent rester exactement celles fournies dans le prompt."];
      } else {
        return { ok: true, markdown, course: parsed.course };
      }
    }
  }

  return { ok: false, errors: validationErrors };
}
