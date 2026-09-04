import { evaluateEligibility, type EligibilityResult } from "@/lib/eligibility";
import type { ParsedResume } from "@/lib/resume-parse";

export type RoadmapData = {
  profile: any | null;
  subjects: any[];
  applications: any[];
  tasks: any[];
  resumes: any[];
  resumeVersions: any[];
  manual: Record<string, string[]>; // stage_key -> completed milestone keys
  /** Facts extracted from the primary uploaded resume. Never invented. */
  resumeParsed?: ParsedResume | null;
  companies?: any[];
  opportunities?: any[];
};

export type MilestoneResource = { label: string; href: string };

export type Milestone = {
  key: string;
  label: string;
  done: boolean;
  auto: boolean; // derived from real data (not manually checkable)
  hint?: string;
  /** Where the evidence came from, shown to the user. */
  source?: "profile" | "resume" | "planner" | "applications" | "academics" | "manual";
  resources?: MilestoneResource[];
  /** Sequential gating: earlier milestones in the stage must be done first. */
  locked?: boolean;
};

export type Stage = {
  key: string;
  title: string;
  blurb: string;
  milestones: Milestone[];
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  nextAction: string;
  link?: { to: string; label: string };
  locked: boolean;
  /** The single milestone the user should do next in this stage. */
  nextMilestone?: Milestone;
};

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

const PRACTICE_LINKS: MilestoneResource[] = [
  { label: "LeetCode", href: "https://leetcode.com/problemset/" },
  { label: "HackerRank", href: "https://www.hackerrank.com/domains/data-structures" },
  { label: "CodeChef", href: "https://www.codechef.com/practice" },
  { label: "Codeforces", href: "https://codeforces.com/problemset" },
];

function build(
  key: string,
  title: string,
  blurb: string,
  milestones: Milestone[],
  nextActionFallback: string,
  link?: Stage["link"],
): Omit<Stage, "locked"> {
  // Sequential unlocking: a milestone is available once every earlier one is done.
  let blocked = false;
  const gated = milestones.map((m) => {
    const locked = blocked;
    if (!m.done) blocked = true;
    return { ...m, locked };
  });
  const done = gated.filter((m) => m.done).length;
  const progress = gated.length ? Math.round((done / gated.length) * 100) : 0;
  const status = progress === 0 ? "not_started" : progress === 100 ? "completed" : "in_progress";
  const next = gated.find((m) => !m.done);
  return {
    key,
    title,
    blurb,
    milestones: gated,
    progress,
    status,
    nextAction: next ? next.label : nextActionFallback,
    nextMilestone: next,
    link,
  };
}

export const STAGE_KEYS = [
  "fundamentals",
  "programming",
  "technical",
  "dsa",
  "projects",
  "resume",
  "profiles",
  "applications",
  "interview",
  "goal",
] as const;

export function computeRoadmap(d: RoadmapData): Stage[] {
  const p = d.profile ?? {};
  const rp = d.resumeParsed ?? null;
  const manual = (k: string) => d.manual[k] ?? [];
  const m = (
    stage: string,
    key: string,
    label: string,
    done: boolean,
    opts: {
      auto?: boolean;
      hint?: string;
      source?: Milestone["source"];
      resources?: MilestoneResource[];
    } = {},
  ): Milestone => {
    const auto = opts.auto ?? true;
    return {
      key,
      label,
      auto,
      done: auto ? done : manual(stage).includes(key),
      hint: opts.hint,
      source: auto ? opts.source : "manual",
      resources: opts.resources,
    };
  };

  const profileSkills: string[] = arr(p.skills);
  const resumeSkills: string[] = rp?.skills ?? [];
  const skills = Array.from(new Set([...profileSkills, ...resumeSkills]));
  const projects: any[] = arr(p.projects);
  const certifications: any[] = arr(p.certifications);
  const coding: Record<string, string> = (p.coding_profiles ?? {}) as any;
  const codingCount = Object.values(coding).filter((v) => typeof v === "string" && v.trim()).length;
  const resumeLinks = rp?.links ?? {};
  const apps = d.applications;
  const primaryResume = d.resumes.find((r) => r.is_primary) ?? d.resumes[0];
  const dsaTasks = d.tasks.filter((t) => t.category === "dsa");

  const stages = [
    build(
      "fundamentals",
      "Fundamentals",
      "Set up your academic identity so every recommendation is grounded in real data.",
      [
        m("fundamentals", "name", "Add your full name", Boolean(p.full_name), { source: "profile" }),
        m("fundamentals", "college", "Add college / university", Boolean(p.college || p.university), { source: "profile" }),
        m("fundamentals", "branch", "Add branch and degree", Boolean(p.branch), { source: "profile" }),
        m("fundamentals", "grad", "Set graduation year", Boolean(p.graduation_year), { source: "profile" }),
        m("fundamentals", "cgpa", "Record current CGPA", p.cgpa != null, { source: "profile" }),
        m("fundamentals", "semester", "Log at least one semester result", d.subjects.length > 0 || p.current_semester != null, {
          source: "academics",
        }),
      ],
      "Fundamentals complete — your profile is placement-ready.",
      { to: "/profile", label: "Complete profile" },
    ),
    build(
      "programming",
      "Programming & Core Skills",
      "Track the languages and core CS subjects you can defend in an interview.",
      [
        m("programming", "lang", "List at least 1 programming skill", skills.length >= 1, { source: "profile" }),
        m("programming", "lang3", "List 3+ skills", skills.length >= 3, { source: "profile" }),
        m("programming", "lang6", "List 6+ skills", skills.length >= 6, { source: "profile" }),
        m("programming", "subject", "Add a core subject you're studying", d.subjects.length > 0, { source: "academics" }),
        m(
          "programming",
          "resumeskills",
          "Your uploaded resume lists your skills",
          Boolean(rp?.sections.skills && resumeSkills.length > 0),
          { source: "resume", hint: "Upload a resume in Resume Studio so we can read it" },
        ),
      ],
      "Core skills logged.",
      { to: "/profile", label: "Add skills" },
    ),
    build(
      "technical",
      "Technical Skills",
      "Depth beyond the basics — frameworks, tools, and certifications.",
      [
        m("technical", "skills8", "Reach 8+ listed skills", skills.length >= 8, { source: "profile" }),
        m("technical", "cert", "Add a certification", certifications.length > 0 || (rp?.counts.certifications ?? 0) > 0, {
          source: "profile",
        }),
        m("technical", "roles", "Set preferred roles", arr(p.preferred_roles).length > 0, { source: "profile" }),
        m("technical", "interests", "Set career interests", arr(p.career_interests).length > 0, { source: "profile" }),
      ],
      "Technical breadth captured.",
      { to: "/profile", label: "Update profile" },
    ),
    build(
      "dsa",
      "DSA & Coding Practice",
      "Consistent problem solving with a public track record.",
      [
        m(
          "dsa",
          "coding",
          "Link a coding profile (LeetCode / GFG / Codeforces)",
          codingCount > 0 || Boolean(resumeLinks.leetcode || resumeLinks.codeforces || resumeLinks.codechef || resumeLinks.hackerrank),
          { source: "profile", resources: PRACTICE_LINKS },
        ),
        m("dsa", "coding2", "Link a second coding profile", codingCount > 1, { source: "profile", resources: PRACTICE_LINKS }),
        m("dsa", "tasks", "Schedule DSA practice in the Planner", dsaTasks.length > 0, {
          source: "planner",
          resources: PRACTICE_LINKS,
        }),
        m("dsa", "tasksdone", "Complete 10 practice sessions", dsaTasks.filter((t) => t.is_done).length >= 10, {
          source: "planner",
          resources: PRACTICE_LINKS,
        }),
        m("dsa", "tasksdone25", "Complete 25 practice sessions", dsaTasks.filter((t) => t.is_done).length >= 25, {
          source: "planner",
          resources: PRACTICE_LINKS,
        }),
      ],
      "Practice habit is established.",
      { to: "/planner", label: "Plan practice" },
    ),
    build(
      "projects",
      "Projects",
      "Two to three substantial projects carry most interviews.",
      [
        m("projects", "p1", "Add your first project", projects.length >= 1 || (rp?.counts.projects ?? 0) >= 1, { source: "profile" }),
        m("projects", "p2", "Add a second project", projects.length >= 2 || (rp?.counts.projects ?? 0) >= 2, { source: "profile" }),
        m("projects", "p3", "Add a third project", projects.length >= 3 || (rp?.counts.projects ?? 0) >= 3, { source: "profile" }),
        m(
          "projects",
          "links",
          "Every project has a link or description",
          projects.length > 0 && projects.every((x: any) => x?.link || x?.description),
          { source: "profile" },
        ),
        m("projects", "github", "Push your projects to GitHub", Boolean((coding as any).github || resumeLinks.github), {
          source: "resume",
          resources: [{ label: "GitHub", href: "https://github.com/new" }],
        }),
      ],
      "Project portfolio looks solid.",
      { to: "/resume", label: "Edit projects" },
    ),
    build(
      "resume",
      "Resume",
      "One strong base resume, then role-specific variants.",
      [
        m("resume", "version", "Create a resume version in Resume Studio", d.resumeVersions.length > 0, { source: "resume" }),
        m("resume", "upload", "Upload a PDF resume", d.resumes.length > 0, { source: "resume" }),
        m("resume", "parsed", "Resume text is readable (ATS-friendly)", Boolean(rp?.textExtracted), {
          source: "resume",
          hint: "Upload a text-based PDF, not a scan",
        }),
        m("resume", "primary", "Mark a primary resume", Boolean(primaryResume?.is_primary), { source: "resume" }),
        m("resume", "sections", "Resume covers education, skills and projects", Boolean(
          rp?.sections.education && rp?.sections.skills && rp?.sections.projects,
        ), { source: "resume" }),
        m("resume", "targeted", "Create a role-specific version", d.resumeVersions.some((v) => v.target_role), { source: "resume" }),
      ],
      "Resume set is ready to send.",
      { to: "/resume", label: "Open Resume Studio" },
    ),
    build(
      "profiles",
      "Professional Profiles",
      "Recruiters check your links before your resume.",
      [
        m("profiles", "linkedin", "Add LinkedIn", Boolean((coding as any).linkedin || resumeLinks.linkedin), {
          source: "profile",
          resources: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/" }],
        }),
        m("profiles", "github", "Add GitHub", Boolean((coding as any).github || resumeLinks.github), {
          source: "profile",
          resources: [{ label: "GitHub", href: "https://github.com/" }],
        }),
        m("profiles", "portfolio", "Add portfolio or personal site", Boolean((coding as any).portfolio), { source: "profile" }),
        m("profiles", "achievements", "Write your achievements summary", Boolean(p.achievements || rp?.sections.achievements), {
          source: "profile",
        }),
      ],
      "Your professional footprint is complete.",
      { to: "/profile", label: "Add links" },
    ),
    build(
      "applications",
      "Applications",
      "Volume plus tracking beats guesswork.",
      [
        m("applications", "a1", "Log your first application", apps.length >= 1, { source: "applications" }),
        m("applications", "a5", "Log 5 applications", apps.length >= 5, { source: "applications" }),
        m("applications", "a15", "Log 15 applications", apps.length >= 15, { source: "applications" }),
        m("applications", "dream", "Shortlist dream companies", arr(p.dream_companies).length > 0, { source: "profile" }),
      ],
      "Application pipeline is active.",
      { to: "/applications", label: "Track applications" },
    ),
    build(
      "interview",
      "Interview Preparation",
      "Convert applications into interviews and offers.",
      [
        m(
          "interview",
          "shortlist",
          "Reach a shortlist / OA stage",
          apps.some((a) => ["oa", "shortlisted", "screening"].includes(a.status)),
          { source: "applications" },
        ),
        m("interview", "interview", "Attend an interview round", apps.some((a) => a.status === "interview"), {
          source: "applications",
        }),
        m("interview", "topics", "Add interview topics to a subject", d.subjects.some((s) => arr(s.interview_topics).length > 0), {
          source: "academics",
        }),
        m("interview", "mock", "Run a mock interview with AI Mentor", false, {
          auto: false,
          hint: "Mark manually once done",
        }),
      ],
      "Interview readiness looks strong.",
      { to: "/mentor", label: "Practice with AI Mentor" },
    ),
    build(
      "goal",
      "Career Goal",
      "The finish line: an offer that matches your target.",
      [
        m("goal", "target", "Define preferred roles", arr(p.preferred_roles).length > 0, { source: "profile" }),
        m("goal", "targetcgpa", "Set a target CGPA", p.target_cgpa != null, { source: "profile" }),
        m("goal", "offer", "Receive an offer", apps.some((a) => a.status === "offer"), { source: "applications" }),
        m("goal", "accept", "Accept your offer", false, { auto: false, hint: "Mark manually once done" }),
      ],
      "Congratulations — goal reached.",
      { to: "/applications", label: "Review pipeline" },
    ),
  ];

  // Stage-level unlocking: a stage opens once the previous one is at least 60% done.
  return stages.map((s, i) => {
    const prev = stages[i - 1];
    return { ...s, locked: i === 0 ? false : (prev?.progress ?? 0) < 60 } as Stage;
  });
}

export function roadmapOverall(stages: Stage[]) {
  if (!stages.length) return 0;
  return Math.round(stages.reduce((a, s) => a + s.progress, 0) / stages.length);
}

/** The single next milestone across the whole roadmap (first unlocked, undone). */
export function nextUp(stages: Stage[]) {
  for (const s of stages) {
    if (s.locked) continue;
    const ms = s.milestones.find((x) => !x.done && !x.locked) ?? s.milestones.find((x) => !x.done);
    if (ms) return { stage: s, milestone: ms };
  }
  return null;
}

export type Suggestions = {
  goals: { label: string; reason: string }[];
  skills: { skill: string; reason: string }[];
  companies: { company: any; eligibility: EligibilityResult }[];
  opportunities: any[];
  resumeGaps: string[];
};

const ROLE_HINTS: { role: string; keys: string[] }[] = [
  { role: "Frontend Engineer", keys: ["react", "javascript", "typescript", "css", "html", "tailwind", "vue", "angular"] },
  { role: "Backend Engineer", keys: ["node.js", "express", "java", "spring boot", "django", "flask", "fastapi", "sql", "postgresql"] },
  { role: "Full-Stack Engineer", keys: ["react", "node.js", "sql", "typescript", "next.js"] },
  { role: "Data Analyst", keys: ["sql", "excel", "power bi", "tableau", "pandas", "python"] },
  { role: "Data / ML Engineer", keys: ["machine learning", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn", "deep learning"] },
  { role: "DevOps / Cloud Engineer", keys: ["aws", "docker", "kubernetes", "linux", "terraform", "ci/cd", "azure", "gcp"] },
  { role: "Mobile Engineer", keys: ["flutter", "react native", "kotlin", "swift"] },
];

/**
 * All suggestions are derived from data the user actually entered plus verified
 * rows already stored in the database. No company, salary or eligibility fact is
 * generated here — company rows are passed through as stored.
 */
export function buildSuggestions(d: RoadmapData): Suggestions {
  const p = d.profile ?? {};
  const rp = d.resumeParsed ?? null;
  const skills = Array.from(new Set([...arr(p.skills), ...(rp?.skills ?? [])])).map((s) => String(s));
  const lower = skills.map((s) => s.toLowerCase());

  const stated: string[] = arr(p.preferred_roles).map(String);
  const matched = ROLE_HINTS.map((r) => ({
    role: r.role,
    hits: r.keys.filter((k) => lower.includes(k)).length,
  }))
    .filter((r) => r.hits >= 2)
    .sort((a, b) => b.hits - a.hits);

  const goals = [
    ...stated.map((r) => ({ label: r, reason: "You listed this as a preferred role." })),
    ...matched
      .filter((r) => !stated.some((s) => s.toLowerCase() === r.role.toLowerCase()))
      .slice(0, 3)
      .map((r) => ({ label: r.role, reason: `Matches ${r.hits} skills already on your profile or resume.` })),
  ];

  const student = {
    cgpa: p.cgpa ?? null,
    branch: p.branch ?? null,
    state: p.state ?? null,
    graduation_year: p.graduation_year ?? null,
    degree: p.degree ?? null,
  };

  const companies = (d.companies ?? [])
    .map((c) => ({
      company: c,
      eligibility: evaluateEligibility(student, {
        min_cgpa: c.min_cgpa,
        allowed_branches: c.allowed_branches,
      }),
    }))
    .filter((c) => c.eligibility.verdict !== "not_eligible")
    .slice(0, 6);

  // Skills to work on: tech stacks stored on eligible companies that you don't list yet.
  const gapCount = new Map<string, number>();
  for (const { company } of companies) {
    for (const t of arr(company.tech_stack)) {
      const key = String(t);
      if (lower.includes(key.toLowerCase())) continue;
      gapCount.set(key, (gapCount.get(key) ?? 0) + 1);
    }
  }
  const skillSuggestions = [...gapCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, n]) => ({
      skill,
      reason: `Listed in the verified tech stack of ${n} matching ${n === 1 ? "company" : "companies"}.`,
    }));

  const today = new Date().toISOString().slice(0, 10);
  const opportunities = (d.opportunities ?? [])
    .filter((o) => !o.deadline || o.deadline >= today)
    .filter((o) => {
      const r = evaluateEligibility(student, {
        min_cgpa: o.min_cgpa,
        branches: o.branches,
        graduation_years: o.graduation_years,
        state: o.state,
      });
      return r.verdict !== "not_eligible";
    })
    .slice(0, 5);

  const resumeGaps: string[] = [];
  if (!d.resumes.length) resumeGaps.push("No resume uploaded yet — upload one so the roadmap can read it.");
  else if (!rp?.textExtracted) resumeGaps.push("We could not read text from your uploaded resume (it may be a scan or image PDF).");
  else {
    if (!rp.sections.projects) resumeGaps.push("No Projects section detected in your resume.");
    if (!rp.sections.experience) resumeGaps.push("No Experience/Internship section detected in your resume.");
    if (!rp.sections.certifications) resumeGaps.push("No Certifications section detected in your resume.");
    if (!rp.links.github) resumeGaps.push("No GitHub link found in your resume.");
    if (!rp.links.linkedin) resumeGaps.push("No LinkedIn link found in your resume.");
    if (!rp.email) resumeGaps.push("No email address found in your resume.");
  }

  return { goals, skills: skillSuggestions, companies, opportunities, resumeGaps };
}

export type ResumeSectionData = {
  personal: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
  certifications: boolean;
  achievements: boolean;
  experience: boolean;
};

export function resumeCompleteness(profile: any | null, version: any | null) {
  const p = profile ?? {};
  const s = (version?.sections ?? {}) as any;
  const checks: { key: keyof ResumeSectionData; label: string; done: boolean }[] = [
    { key: "personal", label: "Personal information", done: Boolean(p.full_name && p.email) },
    { key: "education", label: "Education", done: Boolean((p.college || p.university) && p.branch && p.graduation_year) },
    { key: "skills", label: "Skills", done: arr(p.skills).length >= 3 },
    { key: "projects", label: "Projects", done: arr(p.projects).length > 0 || arr(s.projects).length > 0 },
    { key: "certifications", label: "Certifications", done: arr(p.certifications).length > 0 || arr(s.certifications).length > 0 },
    { key: "achievements", label: "Achievements", done: Boolean(p.achievements || s.achievements) },
    { key: "experience", label: "Experience", done: arr(s.experience).length > 0 },
  ];
  const percent = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  return { checks, percent };
}
