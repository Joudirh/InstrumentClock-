export type AcademyQuestion = {
  prompt: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
};

export type AcademyLesson = {
  title: string;
  minutes: number;
  body: string;
};

export type AcademyModule = {
  title: string;
  lessons: AcademyLesson[];
  quiz: AcademyQuestion[];
};

export type ParsedAcademyCourse = {
  code: string;
  slug: string;
  title: string;
  domain: string;
  path: string;
  level: string;
  summary: string;
  objectives: string[];
  modules: AcademyModule[];
  exam: AcademyQuestion[];
  estimatedMinutes: number;
};

export type AcademyImportResult =
  | { ok: true; course: ParsedAcademyCourse }
  | { ok: false; errors: string[] };

const LEVELS = new Set(["Débutant", "Intermédiaire", "Avancé", "Expert"]);
const MAX_MARKDOWN_BYTES = 512 * 1024;
const MIN_EXAM_QUESTIONS = 30;
const MIN_MODULE_QUESTIONS = 8;

const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();

export function parseAcademyMarkdown(markdown: unknown): AcademyImportResult {
  if (typeof markdown !== "string") {
    return { ok: false, errors: ["Le contenu Markdown est requis."] };
  }
  if (new TextEncoder().encode(markdown).byteLength > MAX_MARKDOWN_BYTES) {
    return { ok: false, errors: ["Le fichier dépasse la limite de 512 Ko."] };
  }

  const source = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!frontmatter) {
    return { ok: false, errors: ["Le fichier doit commencer par un en-tête YAML entre deux lignes ---." ] };
  }

  const errors: string[] = [];
  const metadata: Record<string, string> = {};
  const objectives: string[] = [];
  let readingObjectives = false;

  for (const rawLine of frontmatter[1].split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const objective = line.match(/^-\s+(.+)$/);
    if (objective && readingObjectives) {
      objectives.push(cleanText(objective[1]));
      continue;
    }
    const field = line.match(/^([a-z_]+):\s*(.*?)\s*$/);
    if (!field) {
      errors.push(`En-tête YAML invalide : « ${line} ».`);
      continue;
    }
    const [, key, value] = field;
    if (key === "objectives") {
      readingObjectives = true;
      if (value) errors.push("Les objectifs doivent être une liste YAML (« - objectif »).");
    } else {
      readingObjectives = false;
      if (metadata[key] !== undefined) errors.push(`Champ YAML dupliqué : ${key}.`);
      metadata[key] = value.replace(/^["']|["']$/g, "").trim();
    }
  }

  const requiredFields = ["code", "slug", "title", "domain", "path", "level", "summary"];
  for (const field of requiredFields) {
    if (!metadata[field]) errors.push(`Champ obligatoire manquant dans l’en-tête : ${field}.`);
  }
  if (metadata.code && !/^[A-H][1-7]-\d{2}$/.test(metadata.code)) {
    errors.push("Le code doit respecter le format A1-01 à H1-99 (ex. A1-02).");
  }
  if (metadata.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug)) {
    errors.push("Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets.");
  }
  if (metadata.domain && !/^[A-H]$/.test(metadata.domain)) {
    errors.push("Le domaine doit être une lettre de A à H.");
  }
  if (metadata.path && !/^[A-H][1-7]$/.test(metadata.path)) {
    errors.push("Le parcours doit respecter le format A1 à H1.");
  }
  if (metadata.code && metadata.path && !metadata.code.startsWith(`${metadata.path}-`)) {
    errors.push("Le code du cours doit commencer par le code de son parcours.");
  }
  if (metadata.domain && metadata.path && metadata.domain !== metadata.path[0]) {
    errors.push("Le domaine indiqué ne correspond pas au code du parcours.");
  }
  if (metadata.level && !LEVELS.has(metadata.level)) {
    errors.push("Le niveau doit être Débutant, Intermédiaire, Avancé ou Expert.");
  }
  if ((metadata.title || "").length > 160) errors.push("Le titre ne peut pas dépasser 160 caractères.");
  if ((metadata.summary || "").length < 30) errors.push("Le résumé doit contenir au moins 30 caractères.");
  if ((metadata.summary || "").length > 500) errors.push("Le résumé ne peut pas dépasser 500 caractères.");
  if (objectives.length < 2 || objectives.some((item) => item.length < 10)) {
    errors.push("Ajoutez au moins deux objectifs pédagogiques (10 caractères minimum chacun).");
  }

  const modules: AcademyModule[] = [];
  const exam: AcademyQuestion[] = [];
  let currentModule: AcademyModule | null = null;
  let currentLesson: AcademyLesson | null = null;
  let currentQuestion: AcademyQuestion | null = null;
  let mode: "intro" | "lesson" | "quiz" | "exam" = "intro";

  const saveQuestion = () => {
    if (!currentQuestion) return;
    const target = mode === "exam" ? exam : currentModule?.quiz;
    if (target) target.push(currentQuestion);
    currentQuestion = null;
  };

  const lines = frontmatter[2].split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    let match = line.match(/^##\s+Module\s+\d+\s*[—-]\s*(.+)$/i);
    if (match) {
      saveQuestion();
      currentLesson = null;
      currentModule = { title: cleanText(match[1]), lessons: [], quiz: [] };
      modules.push(currentModule);
      mode = "intro";
      continue;
    }

    if (/^##\s+Examen final\s*$/i.test(line)) {
      saveQuestion();
      currentLesson = null;
      currentModule = null;
      mode = "exam";
      continue;
    }

    match = line.match(/^###\s+Leçon\s+\d+\s*[—-]\s*(.+?)\s*\((\d+)\s*min\)\s*$/i);
    if (match && currentModule) {
      saveQuestion();
      const minutes = Number(match[2]);
      currentLesson = { title: cleanText(match[1]), minutes, body: "" };
      currentModule.lessons.push(currentLesson);
      mode = "lesson";
      continue;
    }

    if (/^###\s+Quiz du module\s*$/i.test(line) && currentModule) {
      saveQuestion();
      currentLesson = null;
      mode = "quiz";
      continue;
    }

    match = line.match(/^####\s+Question\s+\d+\s*[—-]\s*(.+)$/i);
    if (match && (mode === "quiz" || mode === "exam")) {
      saveQuestion();
      currentQuestion = {
        prompt: cleanText(match[1]),
        options: [],
        explanation: ""
      };
      continue;
    }

    match = line.match(/^- \[([ xX])\]\s+(.+)$/);
    if (match && currentQuestion) {
      currentQuestion.options.push({
        text: cleanText(match[2]),
        correct: match[1].toLowerCase() === "x"
      });
      continue;
    }

    match = line.match(/^Explication\s*:\s*(.+)$/i);
    if (match && currentQuestion) {
      currentQuestion.explanation = cleanText(match[1]);
      continue;
    }

    if (mode === "lesson" && currentLesson && line.trim() && (!line.startsWith("#") || /^#{1,6}\s+/.test(line))) {
      currentLesson.body += `${line.trim()}\n`;
    }
  }
  saveQuestion();

  if (modules.length < 4 || modules.length > 7) errors.push("Un cours publiable doit contenir de quatre à sept modules.");
  let estimatedMinutes = 0;
  modules.forEach((module, moduleIndex) => {
    const label = `Module ${moduleIndex + 1} (« ${module.title || "sans titre"} »)`;
    if (!module.title) errors.push(`${label} : le titre est requis.`);
    if (module.lessons.length < 3 || module.lessons.length > 6) {
      errors.push(`${label} : prévoyez de 3 à 6 leçons.`);
    }
    module.lessons.forEach((lesson) => {
      estimatedMinutes += lesson.minutes;
      if (lesson.minutes < 5 || lesson.minutes > 12) {
        errors.push(`${label}, leçon « ${lesson.title} » : la durée doit être comprise entre 5 et 12 minutes.`);
      }
      if (lesson.body.trim().length < 80) {
        errors.push(`${label}, leçon « ${lesson.title} » : le contenu doit faire au moins 80 caractères.`);
      }
    });
    if (module.quiz.length < MIN_MODULE_QUESTIONS) {
      errors.push(`${label} : le quiz doit contenir au moins ${MIN_MODULE_QUESTIONS} questions.`);
    }
    module.quiz.forEach((question, questionIndex) => validateQuestion(question, `${label}, question ${questionIndex + 1}`, errors));
  });
  if (exam.length < MIN_EXAM_QUESTIONS) {
    errors.push(`L’examen final doit contenir au moins ${MIN_EXAM_QUESTIONS} questions afin de permettre un tirage de 20 questions avec un pool suffisant.`);
  }
  exam.forEach((question, questionIndex) => validateQuestion(question, `Examen final, question ${questionIndex + 1}`, errors));
  if (estimatedMinutes < 60) errors.push("La durée pédagogique totale doit atteindre au moins 60 minutes.");

  if (errors.length) return { ok: false, errors: [...new Set(errors)] };
  return {
    ok: true,
    course: {
      code: metadata.code,
      slug: metadata.slug,
      title: metadata.title,
      domain: metadata.domain,
      path: metadata.path,
      level: metadata.level,
      summary: metadata.summary,
      objectives,
      modules,
      exam,
      estimatedMinutes
    }
  };
}

function validateQuestion(question: AcademyQuestion, label: string, errors: string[]) {
  if (question.prompt.length < 10) errors.push(`${label} : la question est trop courte.`);
  if (question.options.length < 3) errors.push(`${label} : fournissez au moins trois choix.`);
  if (question.options.filter((option) => option.correct).length !== 1) {
    errors.push(`${label} : indiquez exactement une bonne réponse avec [x].`);
  }
  if (question.options.some((option) => option.text.length < 2)) errors.push(`${label} : un choix de réponse est vide.`);
  if (question.explanation.length < 20) errors.push(`${label} : ajoutez une explication d’au moins 20 caractères.`);
}
