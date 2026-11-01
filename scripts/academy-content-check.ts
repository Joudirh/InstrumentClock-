import assert from "node:assert/strict";
import { parseAcademyMarkdown } from "../lib/academy-import.js";
import { ACADEMY_CATALOG, academyCatalogEntry } from "../lib/academy-catalog.js";
import { generateAcademyPart } from "../lib/academy-generation.js";

assert.equal(ACADEMY_CATALOG.length, 71);
assert.equal(new Set(ACADEMY_CATALOG.map((course) => course.code)).size, ACADEMY_CATALOG.length);
assert.equal(academyCatalogEntry("A1-01")?.path, "A1");
assert.equal(academyCatalogEntry("A1-01")?.domain, "A");

const question = (index: number) => `#### Question ${index} — Quel principe est vérifié dans cet exemple ?
- [x] Le choix correct numéro ${index}
- [ ] Un distracteur cohérent numéro ${index}
- [ ] Un autre distracteur numéro ${index}

Explication : Cette explication relie le choix correct au concept étudié dans le cours.`;

const markdown = `---
code: A1-02
slug: sessions-de-trading
title: Les sessions de trading
domain: A
path: A1
level: Débutant
summary: Comprendre les horaires et les caractéristiques des sessions de marché.
objectives:
  - Identifier les principales sessions de marché.
  - Comparer les horaires locaux et les fuseaux.
---
${Array.from({ length: 4 }, (_, moduleIndex) => `## Module ${moduleIndex + 1} — Module de test ${moduleIndex + 1}

${Array.from({ length: 3 }, (_, lessonIndex) => `### Leçon ${lessonIndex + 1} — Leçon de test ${lessonIndex + 1} (8 min)

Cette leçon explique une notion de marché avec un exemple détaillé, indique ses limites et rappelle qu’il s’agit d’un contenu pédagogique.
`).join("\n")}
### Quiz du module

${Array.from({ length: 8 }, (_, questionIndex) => question(questionIndex + 1)).join("\n\n")}
`).join("\n")}
## Examen final

${Array.from({ length: 30 }, (_, questionIndex) => question(questionIndex + 1)).join("\n\n")}
`;

const valid = parseAcademyMarkdown(markdown);
assert.equal(valid.ok, true, valid.ok ? "" : valid.errors.join("\n"));
if (valid.ok) {
  assert.equal(valid.course.modules.length, 4);
  assert.equal(valid.course.modules.reduce((sum, module) => sum + module.lessons.length, 0), 12);
  assert.equal(valid.course.exam.length, 30);
  assert.equal(valid.course.estimatedMinutes, 96);
}

const tooFewExamQuestions = parseAcademyMarkdown(markdown.replace(question(30), ""));
assert.equal(tooFewExamQuestions.ok, false);
assert.match(tooFewExamQuestions.ok ? "" : tooFewExamQuestions.errors.join(" "), /examen final doit contenir au moins 30 questions/);

const twoCorrectAnswers = parseAcademyMarkdown(markdown.replace("- [ ] Un distracteur cohérent numéro 1", "- [x] Un distracteur cohérent numéro 1"));
assert.equal(twoCorrectAnswers.ok, false);
assert.match(twoCorrectAnswers.ok ? "" : twoCorrectAnswers.errors.join(" "), /exactement une bonne réponse/);

const oversized = parseAcademyMarkdown("x".repeat(512 * 1024 + 1));
assert.equal(oversized.ok, false);
assert.match(oversized.ok ? "" : oversized.errors.join(" "), /512 Ko/);

const previousFetch = globalThis.fetch;
const previousApiKey = process.env.GEMINI_API_KEY;
let generationCalls = 0;
const prompts: string[] = [];
const moduleSource = markdown.slice(markdown.indexOf("---", 4) + 3, markdown.indexOf("## Examen final")).trim();
const yaml = markdown.slice(0, markdown.indexOf("---", 4) + 3);
const moduleSections = moduleSource.split(/(?=^## Module \d+\s*[—-])/m).filter(Boolean);
const moduleParts = [`${yaml}\n${moduleSections[0]}`, ...moduleSections.slice(1)];
const examSource = markdown.slice(markdown.indexOf("## Examen final"));
const examQuestions = examSource
  .replace(/^## Examen final\s*\n/, "")
  .trim()
  .split(/(?=^#### Question \d+\s*[—-])/m)
  .filter(Boolean);
const examParts = Array.from({ length: 3 }, (_, index) =>
  `${index === 0 ? "## Examen final\n\n" : ""}${examQuestions.slice(index * 10, (index + 1) * 10).join("\n\n")}`);
process.env.GEMINI_API_KEY = "test-key";
globalThis.fetch = async (_input, init) => {
  generationCalls += 1;
  const request = JSON.parse(String(init?.body)) as {
    contents: Array<{ parts: Array<{ text: string }> }>;
    generationConfig: { maxOutputTokens: number };
  };
  const prompt = request.contents[0].parts[0].text;
  prompts.push(prompt);
  assert.ok(request.generationConfig.maxOutputTokens <= 5_000);
  const moduleMatch = prompt.match(/Génère uniquement le module (\d)/);
  const examMatch = prompt.match(/questions (\d+) à (\d+) de l’examen final/);
  const generatedText = moduleMatch
    ? moduleParts[Number(moduleMatch[1]) - 1]
    : examMatch
      ? examParts[Math.floor((Number(examMatch[1]) - 1) / 10)]
      : "";
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: generatedText }] }, finishReason: "STOP" }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};

try {
  const parts: string[] = [];
  for (let index = 0; index < 4; index += 1) {
    parts.push(await generateAcademyPart(academyCatalogEntry("A1-02")!, "", "sessions-de-trading", {
      type: "module",
      index,
    }));
  }
  for (let index = 0; index < 3; index += 1) {
    parts.push(await generateAcademyPart(academyCatalogEntry("A1-02")!, "", "sessions-de-trading", {
      type: "exam",
      index,
    }));
  }
  const generated = parseAcademyMarkdown(parts.join("\n\n"));
  assert.equal(generated.ok, true, generated.ok ? "" : generated.errors.join("\n"));
  assert.equal(generationCalls, 7);
  assert.equal(prompts.filter((prompt) => prompt.includes("Génère uniquement le module")).length, 4);
  assert.equal(prompts.filter((prompt) => prompt.includes("de l’examen final")).length, 3);
  assert.match(prompts[0], /summary: Un résumé descriptif/);
  assert.match(prompts[0], /objectives:\s+- Premier objectif pédagogique/);
  await generateAcademyPart(
    academyCatalogEntry("A1-02")!,
    "",
    "sessions-de-trading",
    { type: "module", index: 3 },
    { previousText: "Question sans réponse correcte", errors: ["Module 4 : indiquez exactement une bonne réponse."] },
  );
  assert.equal(generationCalls, 8);
  assert.ok(prompts[7].includes("Question sans réponse correcte"));
  assert.ok(prompts[7].includes("indiquez exactement une bonne réponse"));
  await assert.rejects(
    generateAcademyPart(academyCatalogEntry("A1-02")!, "", "sessions-de-trading", { type: "module", index: 4 }),
    /section de module demandée est invalide/,
  );
} finally {
  globalThis.fetch = previousFetch;
  if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousApiKey;
}

console.log("Academy content validation and segmented generation checks passed.");
