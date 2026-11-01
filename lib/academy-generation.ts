import type { AcademyCatalogEntry } from "./academy-catalog.js";
import { parseAcademyMarkdown, type ParsedAcademyCourse } from "./academy-import.js";

const MAX_INSTRUCTIONS_LENGTH = 2_000;
const GENERATION_TIMEOUT_MS = 24_000;

type GenerationRepair = {
  previousMarkdown: string;
  validationErrors: string[];
};

function repairInstructions(markdown: string | undefined, errors: string[]): string {
  if (!markdown) return "";
  return `\n\nCorrige ta sortie précédente, qui a échoué à la validation. Respecte toutes ces erreurs :
${errors.map((error) => `- ${error}`).join("\n")}

Retourne le bloc complet corrigé, pas un résumé. Voici ta sortie précédente :
<sortie_precedente>
${markdown}
</sortie_precedente>`;
}

function courseContext(course: AcademyCatalogEntry, slug: string, instructions: string): string {
  return `Tu es concepteur pédagogique spécialisé en éducation financière. Rédige en français, avec un ton rigoureux et neutre, pour le niveau ${course.level}.

Métadonnées exactes à utiliser :
code: ${course.code}
slug: ${slug}
title: ${course.title}
domain: ${course.domain}
path: ${course.path}
level: ${course.level}

Consignes de l’administrateur :
${instructions || "Aucune consigne complémentaire. Déduis des objectifs pertinents du titre du cours."}

Le contenu doit rester éducatif, mentionner les risques, ne promettre aucun gain et ne recommander aucun investissement.`;
}

function modulesPrompt(
  course: AcademyCatalogEntry,
  slug: string,
  instructions: string,
  previousMarkdown?: string,
  errors: string[] = [],
): string {
  return `${courseContext(course, slug, instructions)}

Génère uniquement l’en-tête YAML et le contenu des modules, sans examen final ni texte avant/après.

L’en-tête YAML entre lignes --- doit contenir exactement les métadonnées ci-dessus, un résumé de 30 à 500 caractères et au moins deux objectifs.

Génère exactement 4 modules numérotés de 1 à 4 avec les titres « ## Module 1 — Titre ».
Dans chaque module, génère exactement 3 leçons numérotées de 1 à 3, avec les titres « ### Leçon 1 — Titre (8 min) ». Chaque texte de leçon dépasse 80 caractères et contient une explication, un exemple concret et ses limites.
Après les leçons, ajoute « ### Quiz du module » puis au moins 8 questions.

Pour chaque question : titre H4 « #### Question 1 — Question complète ? »; au moins 3 réponses sur des lignes « - [ ] Choix » ou « - [x] Choix »; une seule bonne réponse [x]; puis « Explication : » suivie d’une justification de plus de 20 caractères.

Numérote les sections comme indiqué. N’abrège et n’omet aucune leçon, aucun quiz ni aucune question.
${repairInstructions(previousMarkdown, errors)}`;
}

function examPrompt(
  course: AcademyCatalogEntry,
  slug: string,
  instructions: string,
  previousMarkdown?: string,
  errors: string[] = [],
): string {
  return `${courseContext(course, slug, instructions)}

Génère uniquement la section d’examen final, sans en-tête YAML, modules, ni texte avant/après.
Commence exactement par « ## Examen final » et écris au moins 30 questions distinctes couvrant les objectifs et sujets plausibles de ce cours.

Pour chaque question : titre H4 « #### Question 1 — Question complète ? »; au moins 3 réponses sur des lignes « - [ ] Choix » ou « - [x] Choix »; une seule bonne réponse [x]; puis « Explication : » suivie d’une justification de plus de 20 caractères. Les distracteurs doivent être plausibles et les explications pédagogiques.

N’abrège et n’omet aucune question.
${repairInstructions(previousMarkdown, errors)}`;
}

async function requestGeminiText(
  apiKey: string,
  model: string,
  prompt: string,
  maxOutputTokens: number,
): Promise<string> {
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
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini a dépassé le délai de génération d’un bloc. Réessayez.");
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
    throw new Error(message
      ? `Gemini a refusé la génération : ${message}`
      : `Gemini a renvoyé une erreur HTTP ${response.status}.`);
  }

  const candidate = result.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) {
    throw new Error(`Gemini n’a renvoyé aucun contenu${candidate?.finishReason ? ` (${candidate.finishReason})` : ""}.`);
  }
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error("Gemini a tronqué un bloc du cours. Relancez la génération.");
  }

  return text.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function generateAcademyMarkdown(
  course: AcademyCatalogEntry,
  rawInstructions: string,
  slug: string,
  repair?: GenerationRepair,
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

  const previousModules = repair?.previousMarkdown.split(/^## Examen final\s*$/m)[0].trim();
  const previousExam = repair?.previousMarkdown.match(/^## Examen final\s*[\s\S]*$/m)?.[0].trim();
  const [modules, exam] = await Promise.all([
    requestGeminiText(
      apiKey,
      model,
      modulesPrompt(course, slug, instructions, previousModules, repair?.validationErrors ?? []),
      18_000,
    ),
    requestGeminiText(
      apiKey,
      model,
      examPrompt(course, slug, instructions, previousExam, repair?.validationErrors ?? []),
      8_000,
    ),
  ]);
  return `${modules}\n\n${exam}`.trim();
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
