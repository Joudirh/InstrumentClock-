import type { AcademyCatalogEntry } from "./academy-catalog.js";

const MAX_INSTRUCTIONS_LENGTH = 2_000;
const GENERATION_TIMEOUT_MS = 40_000;

export type AcademyGenerationPart =
  | { type: "module"; index: number }
  | { type: "exam"; index: number };

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

function modulePrompt(
  course: AcademyCatalogEntry,
  slug: string,
  instructions: string,
  index: number,
): string {
  const moduleNumber = index + 1;
  const metadata = index === 0
    ? `Commence par un en-tête YAML entre lignes --- contenant exactement ces métadonnées :
code: ${course.code}
slug: ${slug}
title: ${course.title}
domain: ${course.domain}
path: ${course.path}
level: ${course.level}
Ajoute un résumé de 30 à 500 caractères et au moins deux objectifs (liste YAML « - objectif »), puis le module.`
    : "Retourne uniquement le module demandé, sans en-tête YAML ni texte avant/après.";

  return `${courseContext(course, slug, instructions)}

${metadata}
Génère uniquement le module ${moduleNumber}, avec le titre « ## Module ${moduleNumber} — Titre ».
Il contient exactement 3 leçons numérotées de 1 à 3, avec les titres « ### Leçon 1 — Titre (8 min) ». Chaque texte de leçon dépasse 80 caractères et contient une explication, un exemple concret et ses limites.
Après les leçons, ajoute « ### Quiz du module » puis exactement 8 questions numérotées de 1 à 8.

Pour chaque question : titre H4 « #### Question 1 — Question complète ? »; au moins 3 réponses sur des lignes « - [ ] Choix » ou « - [x] Choix »; une seule bonne réponse [x]; puis « Explication : » suivie d’une justification de plus de 20 caractères.
N’abrège et n’omet aucune leçon, aucun quiz ni aucune question.`;
}

function examPrompt(
  course: AcademyCatalogEntry,
  slug: string,
  instructions: string,
  index: number,
): string {
  const firstQuestion = index * 10 + 1;
  const lastQuestion = firstQuestion + 9;
  const heading = index === 0 ? "Commence exactement par « ## Examen final »." : "Ne répète pas le titre de l’examen.";
  return `${courseContext(course, slug, instructions)}

Génère uniquement les questions ${firstQuestion} à ${lastQuestion} de l’examen final. ${heading}
Écris exactement 10 questions distinctes couvrant les objectifs et sujets plausibles du cours. Numérote-les dans l’ordre de ${firstQuestion} à ${lastQuestion}.
Pour chaque question : titre H4 « #### Question ${firstQuestion} — Question complète ? »; au moins 3 réponses sur des lignes « - [ ] Choix » ou « - [x] Choix »; une seule bonne réponse [x]; puis « Explication : » suivie d’une justification de plus de 20 caractères. Les distracteurs doivent être plausibles et les explications pédagogiques.
N’abrège et n’omet aucune question.`;
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
  let responseBody: string;
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
    responseBody = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini a dépassé le délai de 40 secondes pour une section. Réessayez la génération.");
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
    result = JSON.parse(responseBody) as typeof result;
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
    throw new Error("Gemini a tronqué une section du cours. Relancez la génération.");
  }

  return text.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function generateAcademyPart(
  course: AcademyCatalogEntry,
  rawInstructions: string,
  slug: string,
  part: AcademyGenerationPart,
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

  if (part.type === "module") {
    if (!Number.isInteger(part.index) || part.index < 0 || part.index >= 4) {
      throw new Error("La section de module demandée est invalide.");
    }
    return requestGeminiText(
      apiKey,
      model,
      modulePrompt(course, slug, instructions, part.index),
      5_000,
    );
  }

  if (!Number.isInteger(part.index) || part.index < 0 || part.index >= 3) {
    throw new Error("La section d’examen demandée est invalide.");
  }
  return requestGeminiText(
    apiKey,
    model,
    examPrompt(course, slug, instructions, part.index),
    3_500,
  );
}
