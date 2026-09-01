export type RoadmapData = {
  profile: any | null;
  subjects: any[];
  applications: any[];
  tasks: any[];
  resumes: any[];
  resumeVersions: any[];
  manual: Record<string, string[]>; // stage_key -> completed milestone keys
};

export type Milestone = {
  key: string;
  label: string;
  done: boolean;
  auto: boolean; // derived from real data (not manually checkable)
  hint?: string;
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
};

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

function build(
  key: string,
  title: string,
  blurb: string,
  milestones: Milestone[],
  nextActionFallback: string,
  link?: Stage["link"],
): Stage {
  const done = milestones.filter((m) => m.done).length;
  const progress = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
  const status = progress === 0 ? "not_started" : progress === 100 ? "completed" : "in_progress";
  const next = milestones.find((m) => !m.done);
  return {
    key,
    title,
    blurb,
    milestones,
    progress,
    status,
    nextAction: next ? next.label : nextActionFallback,
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
  const manual = (k: string) => d.manual[k] ?? [];
  const m = (stage: string, key: string, label: string, done: boolean, auto = true, hint?: string): Milestone => ({
    key,
    label,
    auto,
    done: auto ? done : manual(stage).includes(key),
    hint,
  });

  const skills: string[] = arr(p.skills);
  const projects: any[] = arr(p.projects);
  const certifications: any[] = arr(p.certifications);
  const coding: Record<string, string> = (p.coding_profiles ?? {}) as any;
  const codingCount = Object.values(coding).filter((v) => typeof v === "string" && v.trim()).length;
  const apps = d.applications;
  const primaryResume = d.resumes.find((r) => r.is_primary) ?? d.resumes[0];

  return [
    build(
      "fundamentals",
      "Fundamentals",
      "Set up your academic identity so every recommendation is grounded in real data.",
      [
        m("fundamentals", "name", "Add your full name", Boolean(p.full_name)),
        m("fundamentals", "college", "Add college / university", Boolean(p.college || p.university)),
        m("fundamentals", "branch", "Add branch and degree", Boolean(p.branch)),
        m("fundamentals", "grad", "Set graduation year", Boolean(p.graduation_year)),
        m("fundamentals", "cgpa", "Record current CGPA", p.cgpa != null),
      ],
      "Fundamentals complete — your profile is placement-ready.",
      { to: "/profile", label: "Complete profile" },
    ),
    build(
      "programming",
      "Programming & Core Skills",
      "Track the languages and core CS subjects you can defend in an interview.",
      [
        m("programming", "lang", "List at least 1 programming skill", skills.length >= 1),
        m("programming", "lang3", "List 3+ skills", skills.length >= 3),
        m("programming", "lang6", "List 6+ skills", skills.length >= 6),
        m("programming", "subject", "Add a core subject you're studying", d.subjects.length > 0),
      ],
      "Core skills logged.",
      { to: "/profile", label: "Add skills" },
    ),
    build(
      "technical",
      "Technical Skills",
      "Depth beyond the basics — frameworks, tools, and certifications.",
      [
        m("technical", "skills8", "Reach 8+ listed skills", skills.length >= 8),
        m("technical", "cert", "Add a certification", certifications.length > 0),
        m("technical", "roles", "Set preferred roles", arr(p.preferred_roles).length > 0),
        m("technical", "interests", "Set career interests", arr(p.career_interests).length > 0),
      ],
      "Technical breadth captured.",
      { to: "/profile", label: "Update profile" },
    ),
    build(
      "dsa",
      "DSA & Practice",
      "Consistent problem solving with a public track record.",
      [
        m("dsa", "coding", "Link a coding profile (LeetCode / GFG / Codeforces)", codingCount > 0),
        m("dsa", "coding2", "Link a second coding profile", codingCount > 1),
        m("dsa", "tasks", "Log DSA practice tasks in the Planner", d.tasks.some((t) => t.category === "dsa")),
        m(
          "dsa",
          "tasksdone",
          "Complete 10 practice tasks",
          d.tasks.filter((t) => t.category === "dsa" && t.is_done).length >= 10,
        ),
      ],
      "Practice habit is established.",
      { to: "/profile", label: "Add coding profiles" },
    ),
    build(
      "projects",
      "Projects",
      "Two to three substantial projects carry most interviews.",
      [
        m("projects", "p1", "Add your first project", projects.length >= 1),
        m("projects", "p2", "Add a second project", projects.length >= 2),
        m("projects", "p3", "Add a third project", projects.length >= 3),
        m(
          "projects",
          "links",
          "Every project has a link or description",
          projects.length > 0 && projects.every((x: any) => x?.link || x?.description),
        ),
      ],
      "Project portfolio looks solid.",
      { to: "/resume", label: "Edit projects" },
    ),
    build(
      "resume",
      "Resume",
      "One strong base resume, then role-specific variants.",
      [
        m("resume", "version", "Create a resume version in Resume Studio", d.resumeVersions.length > 0),
        m("resume", "upload", "Upload a PDF resume", d.resumes.length > 0),
        m("resume", "primary", "Mark a primary resume", Boolean(primaryResume?.is_primary)),
        m("resume", "targeted", "Create a role-specific version", d.resumeVersions.some((v) => v.target_role)),
      ],
      "Resume set is ready to send.",
      { to: "/resume", label: "Open Resume Studio" },
    ),
    build(
      "profiles",
      "Professional Profiles",
      "Recruiters check your links before your resume.",
      [
        m("profiles", "linkedin", "Add LinkedIn", Boolean((coding as any).linkedin)),
        m("profiles", "github", "Add GitHub", Boolean((coding as any).github)),
        m("profiles", "portfolio", "Add portfolio or personal site", Boolean((coding as any).portfolio)),
        m("profiles", "achievements", "Write your achievements summary", Boolean(p.achievements)),
      ],
      "Your professional footprint is complete.",
      { to: "/profile", label: "Add links" },
    ),
    build(
      "applications",
      "Applications",
      "Volume plus tracking beats guesswork.",
      [
        m("applications", "a1", "Log your first application", apps.length >= 1),
        m("applications", "a5", "Log 5 applications", apps.length >= 5),
        m("applications", "a15", "Log 15 applications", apps.length >= 15),
        m("applications", "dream", "Shortlist dream companies", arr(p.dream_companies).length > 0),
      ],
      "Application pipeline is active.",
      { to: "/applications", label: "Track applications" },
    ),
    build(
      "interview",
      "Interview Preparation",
      "Convert applications into interviews and offers.",
      [
        m("interview", "shortlist", "Reach a shortlist / OA stage", apps.some((a) => ["oa", "shortlisted", "screening"].includes(a.status))),
        m("interview", "interview", "Attend an interview round", apps.some((a) => a.status === "interview")),
        m("interview", "topics", "Add interview topics to a subject", d.subjects.some((s) => arr(s.interview_topics).length > 0)),
        m("interview", "mock", "Run a mock interview with AI Mentor", false, false, "Mark manually once done"),
      ],
      "Interview readiness looks strong.",
      { to: "/mentor", label: "Practice with AI Mentor" },
    ),
    build(
      "goal",
      "Career Goal",
      "The finish line: an offer that matches your target.",
      [
        m("goal", "target", "Define preferred roles", arr(p.preferred_roles).length > 0),
        m("goal", "targetcgpa", "Set a target CGPA", p.target_cgpa != null),
        m("goal", "offer", "Receive an offer", apps.some((a) => a.status === "offer")),
        m("goal", "accept", "Accept your offer", false, false, "Mark manually once done"),
      ],
      "Congratulations — goal reached.",
      { to: "/applications", label: "Review pipeline" },
    ),
  ];
}

export function roadmapOverall(stages: Stage[]) {
  if (!stages.length) return 0;
  return Math.round(stages.reduce((a, s) => a + s.progress, 0) / stages.length);
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
