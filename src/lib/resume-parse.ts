/**
 * Resume parsing — strictly extractive.
 *
 * Nothing here invents content. Every skill, link, section or metric returned
 * is literally present in the uploaded document's text. If the PDF has no
 * extractable text layer we return an explicit `textExtracted: false` so the UI
 * can say so instead of guessing.
 */

export type ParsedResume = {
  textExtracted: boolean;
  wordCount: number;
  skills: string[];
  links: {
    github?: string;
    linkedin?: string;
    leetcode?: string;
    hackerrank?: string;
    codechef?: string;
    codeforces?: string;
    portfolio?: string;
  };
  email?: string;
  phone?: boolean;
  sections: {
    education: boolean;
    experience: boolean;
    projects: boolean;
    skills: boolean;
    certifications: boolean;
    achievements: boolean;
  };
  counts: { projects: number; experience: number; certifications: number };
  parsedAt: string;
};

export const EMPTY_PARSE: ParsedResume = {
  textExtracted: false,
  wordCount: 0,
  skills: [],
  links: {},
  sections: {
    education: false,
    experience: false,
    projects: false,
    skills: false,
    certifications: false,
    achievements: false,
  },
  counts: { projects: 0, experience: 0, certifications: 0 },
  parsedAt: new Date(0).toISOString(),
};

/** Known skill vocabulary. A skill is only reported when it appears verbatim. */
const SKILL_VOCAB = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby", "Scala", "R",
  "React", "Next.js", "Angular", "Vue", "Svelte", "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot",
  "Tailwind", "HTML", "CSS", "Redux", "React Native", "Flutter",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase", "Supabase",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Linux", "Git", "GitHub Actions", "CI/CD", "Jenkins", "Terraform",
  "Data Structures", "Algorithms", "DSA", "Operating Systems", "DBMS", "Computer Networks", "OOP",
  "Machine Learning", "Deep Learning", "NLP", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn",
  "Power BI", "Tableau", "Excel", "Kafka", "GraphQL", "REST API", "Microservices", "Selenium", "Jest", "Cypress",
];

const SECTION_PATTERNS: Record<keyof ParsedResume["sections"], RegExp> = {
  education: /\b(education|academic (background|qualification)|qualifications)\b/i,
  experience: /\b(experience|employment|internship[s]?|work history)\b/i,
  projects: /\bprojects?\b/i,
  skills: /\b(skills|technical skills|technologies)\b/i,
  certifications: /\b(certification[s]?|courses|licenses)\b/i,
  achievements: /\b(achievements?|awards?|honou?rs|accomplishments)\b/i,
};

const LINK_PATTERNS: [keyof ParsedResume["links"], RegExp][] = [
  ["github", /(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_.-]+/i],
  ["linkedin", /(https?:\/\/)?(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+/i],
  ["leetcode", /(https?:\/\/)?(www\.)?leetcode\.com\/[A-Za-z0-9_./-]+/i],
  ["hackerrank", /(https?:\/\/)?(www\.)?hackerrank\.com\/[A-Za-z0-9_./-]+/i],
  ["codechef", /(https?:\/\/)?(www\.)?codechef\.com\/users\/[A-Za-z0-9_.-]+/i],
  ["codeforces", /(https?:\/\/)?(www\.)?codeforces\.com\/profile\/[A-Za-z0-9_.-]+/i],
];

function countBulletsAfter(text: string, heading: RegExp) {
  const lines = text.split(/\n+/);
  const start = lines.findIndex((l) => heading.test(l) && l.trim().length < 60);
  if (start < 0) return 0;
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    // stop at the next section heading
    if (line.length < 60 && Object.values(SECTION_PATTERNS).some((p) => p.test(line) && !heading.test(line))) break;
    if (/^([-•*·▪]|\d+[.)])\s+/.test(line)) count++;
  }
  return count;
}

export function parseResumeText(rawText: string): ParsedResume {
  const text = (rawText ?? "").replace(/\r/g, "");
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 20) return { ...EMPTY_PARSE, parsedAt: new Date().toISOString() };

  const lower = text.toLowerCase();
  const skills = SKILL_VOCAB.filter((s) => {
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(lower);
  });

  const links: ParsedResume["links"] = {};
  for (const [key, pattern] of LINK_PATTERNS) {
    const found = text.match(pattern)?.[0];
    if (found) links[key] = found.startsWith("http") ? found : `https://${found}`;
  }

  const sections = Object.fromEntries(
    Object.entries(SECTION_PATTERNS).map(([k, p]) => [k, p.test(text)]),
  ) as ParsedResume["sections"];

  const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0];

  return {
    textExtracted: true,
    wordCount: words.length,
    skills,
    links,
    email,
    phone: /(\+?\d[\d\s-]{8,}\d)/.test(text),
    sections,
    counts: {
      projects: countBulletsAfter(text, SECTION_PATTERNS.projects),
      experience: countBulletsAfter(text, SECTION_PATTERNS.experience),
      certifications: countBulletsAfter(text, SECTION_PATTERNS.certifications),
    },
    parsedAt: new Date().toISOString(),
  };
}

/** Extract the text layer of a PDF in the browser. Returns "" when there is none. */
export async function extractPdfText(file: File): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    return typeof text === "string" ? text : (text as string[]).join("\n");
  } catch {
    return "";
  }
}

export async function parseResumeFile(file: File): Promise<{ text: string; parsed: ParsedResume }> {
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    const text = await file.text();
    return { text, parsed: parseResumeText(text) };
  }
  const text = await extractPdfText(file);
  return { text, parsed: parseResumeText(text) };
}

export function asParsed(value: unknown): ParsedResume | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ParsedResume>;
  if (!v.sections || typeof v.textExtracted !== "boolean") return null;
  return { ...EMPTY_PARSE, ...(v as ParsedResume) };
}
