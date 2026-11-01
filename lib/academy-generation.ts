import type { AcademyCatalogEntry } from "./academy-catalog.js";

const MAX_INSTRUCTIONS_LENGTH = 2_000;

function promptForCourse(course: AcademyCatalogEntry, slug: string, instructions: string): string {
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

Retourne uniquement le Markdown final, sans bloc de code ni commentaire autour. Respecte exactement cette structure :
1. En-tête YAML entre deux lignes --- avec code, slug, title, domain, path, level, summary (30 à 500 caractères) et objectives (au moins 2 éléments).
2. De 4 à 7 sections « ## Module N — Titre ».
3. Dans chaque module, de 3 à 6 leçons « ### Leçon N — Titre (N min) ». Chaque leçon dure de 5 à 12 minutes et contient au moins 80 caractères utiles, avec une explication, un exemple concret et ses limites.
4. Chaque module se termine par « ### Quiz du module » puis au moins 8 questions au format ci-dessous. Une seule réponse correcte est cochée [x], au moins 3 choix sont proposés et l’explication commence par « Explication : » et dépasse 20 caractères.
5. Termine par « ## Examen final » avec au moins 30 questions au même format.
6. La durée totale des leçons atteint au moins 60 minutes. Les titres des questions sont distincts et les mauvaises réponses sont plausibles.
7. Explique clairement tout exercice pratique. Reste éducatif, mentionne les risques, ne promets aucun gain et ne recommande aucun investissement.

Format exact d’une question :
#### Question 1 — Question complète ?
- [ ] Une réponse incorrecte plausible
- [x] La réponse correcte
- [ ] Une autre réponse incorrecte plausible

Explication : Justification pédagogique claire de la réponse correcte.`;
}

export async function generateAcademyMarkdown(
  course: AcademyCatalogEntry,
  rawInstructions: string,
  slug: string,
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
  const timeout = setTimeout(() => controller.abort(), 55_000);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptForCourse(course, slug, instructions) }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 24_000 },
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
