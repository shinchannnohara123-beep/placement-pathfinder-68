/**
 * Resume → ATS → Roadmap → Planner pipeline.
 *
 * Everything returned here is derived from the text of the user's own uploaded
 * resume plus their stored profile. The model is instructed to never invent
 * skills, projects, education or experience that are not present in the text.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

export type ResumeData = {
  skills: string[];
  projects: { title: string; description?: string; tech?: string[] }[];
  education: { institution?: string; degree?: string; year?: string; score?: string }[];
  experience: { role?: string; org?: string; period?: string; description?: string }[];
};

export type AtsReport = {
  atsScore: number;
  missingKeywords: string[];
  suggestions: { type: "skill" | "project" | "formatting"; text: string }[];
};

export type Roadmap = {
  targetRole: string;
  inferred: boolean;
  weeklyPlan: { week: number; focus: string; tasks: string[] }[];
  skillsToLearn: { skill: string; reason: string }[];
  projectsToBuild: { title: string; description: string; skills: string[] }[];
};

export type PlannerDay = { day: number; tasks: { title: string; category: string; est_minutes?: number }[] };

type PipelineInput = {
  resumeText: string;
  targetRole?: string | null;
  /** Strictly extractive facts already parsed in the browser. */
  extracted?: unknown;
  resumeId?: string | null;
};

async function callGateway(messages: { role: string; content: string }[]) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: MODEL, messages, stream: false }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (res.status === 403) throw new Error("AI access is blocked for this workspace.");
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1]! : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI response could not be read.");
  return JSON.parse(raw.slice(start, end + 1));
}

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const clampScore = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
};

/** Fallback planner if the model omits it: spread roadmap weeks over days. */
function plannerFromRoadmap(roadmap: Roadmap): PlannerDay[] {
  const days: PlannerDay[] = [];
  let day = 1;
  for (const week of roadmap.weeklyPlan) {
    const tasks = week.tasks.slice(0, 7);
    for (const t of tasks) {
      days.push({ day, tasks: [{ title: t, category: "study", est_minutes: 90 }] });
      day++;
    }
  }
  return days.slice(0, 60);
}

export const runResumePipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PipelineInput) => {
    if (!input || typeof input.resumeText !== "string") throw new Error("Resume text is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, branch, degree, graduation_year, cgpa, skills, preferred_roles, career_interests")
      .eq("id", userId)
      .maybeSingle();

    const text = data.resumeText.replace(/\s+/g, " ").trim().slice(0, 18000);
    if (text.length < 80) {
      throw new Error(
        "No readable text could be extracted from this file, so it cannot be analysed. Upload a text-based PDF or DOCX instead of a scan.",
      );
    }

    const system = [
      "You are an ATS and career-planning engine for an Indian engineering student.",
      "STRICT RULES:",
      "- Extract ONLY facts that literally appear in the resume text. Never invent skills, projects, education, experience, dates, employers or metrics.",
      "- If a section is absent, return an empty array for it.",
      "- Every suggestion, skill and project idea must reference the candidate's actual content (name the project, skill or gap) — no generic filler.",
      "- Return STRICT JSON only, no prose, no markdown.",
    ].join("\n");

    const user = `RESUME TEXT:\n"""${text}"""\n\nPROFILE CONTEXT (may be empty): ${JSON.stringify(profile ?? {})}\nBROWSER-EXTRACTED FACTS (verbatim from the file): ${JSON.stringify(data.extracted ?? {})}\nTARGET ROLE: ${data.targetRole || "(not provided — infer the single most fitting role from the resume content)"}\n\nReturn JSON with exactly this shape:\n{
  "resumeData": {
    "skills": ["..."],
    "projects": [{"title":"","description":"","tech":["..."]}],
    "education": [{"institution":"","degree":"","year":"","score":""}],
    "experience": [{"role":"","org":"","period":"","description":""}]
  },
  "atsReport": {
    "atsScore": 0,
    "missingKeywords": ["..."],
    "suggestions": [{"type":"skill|project|formatting","text":"..."}]
  },
  "roadmap": {
    "targetRole": "",
    "inferred": true,
    "weeklyPlan": [{"week":1,"focus":"","tasks":["..."]}],
    "skillsToLearn": [{"skill":"","reason":""}],
    "projectsToBuild": [{"title":"","description":"","skills":["..."]}]
  },
  "planner": [{"day":1,"tasks":[{"title":"","category":"dsa|project|resume|study|application","est_minutes":90}]}]
}\nweeklyPlan must cover 8 weeks. planner must cover the first 28 days, 1-3 tasks each, progressing in the same order as the roadmap. Suggestions must include at least one skill, one project and one formatting item, each tied to this resume.`;

    const raw = await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const parsed = extractJson(raw);

    const resumeData: ResumeData = {
      skills: arr(parsed?.resumeData?.skills).map(String),
      projects: arr(parsed?.resumeData?.projects),
      education: arr(parsed?.resumeData?.education),
      experience: arr(parsed?.resumeData?.experience),
    };

    const atsReport: AtsReport = {
      atsScore: clampScore(parsed?.atsReport?.atsScore),
      missingKeywords: arr(parsed?.atsReport?.missingKeywords).map(String),
      suggestions: arr(parsed?.atsReport?.suggestions)
        .map((s: any) => ({
          type: (["skill", "project", "formatting"].includes(str(s?.type)) ? s.type : "skill") as AtsReport["suggestions"][number]["type"],
          text: str(s?.text ?? s),
        }))
        .filter((s) => s.text),
    };

    const roadmap: Roadmap = {
      targetRole: str(parsed?.roadmap?.targetRole) || str(data.targetRole) || "Software Engineer",
      inferred: !data.targetRole,
      weeklyPlan: arr(parsed?.roadmap?.weeklyPlan).map((w: any, i: number) => ({
        week: Number(w?.week) || i + 1,
        focus: str(w?.focus),
        tasks: arr(w?.tasks).map(String),
      })),
      skillsToLearn: arr(parsed?.roadmap?.skillsToLearn).map((s: any) => ({
        skill: str(s?.skill ?? s),
        reason: str(s?.reason),
      })),
      projectsToBuild: arr(parsed?.roadmap?.projectsToBuild).map((p: any) => ({
        title: str(p?.title),
        description: str(p?.description),
        skills: arr(p?.skills).map(String),
      })),
    };

    let planner: PlannerDay[] = arr(parsed?.planner)
      .map((d: any, i: number) => ({
        day: Number(d?.day) || i + 1,
        tasks: arr(d?.tasks)
          .map((t: any) => ({
            title: str(t?.title ?? t),
            category: str(t?.category) || "study",
            est_minutes: Number(t?.est_minutes) || 60,
          }))
          .filter((t) => t.title),
      }))
      .filter((d) => d.tasks.length);
    if (!planner.length) planner = plannerFromRoadmap(roadmap);

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        resume_data: { ...resumeData, resumeId: data.resumeId ?? null, updatedAt: now } as any,
        ats_report: { ...atsReport, updatedAt: now } as any,
        roadmap_plan: { ...roadmap, updatedAt: now } as any,
        planner_plan: planner as any,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);

    return { resumeData, atsReport, roadmap, planner };
  });
