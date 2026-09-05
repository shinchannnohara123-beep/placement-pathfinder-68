/**
 * Client-side glue for the resume → ATS → roadmap → planner → analytics flow.
 * No UI is owned here; existing screens call these helpers.
 */
import { supabase } from "@/integrations/supabase/client";
import { parseResumeText, type ParsedResume } from "@/lib/resume-parse";
import { runResumePipeline } from "@/lib/career-ai.functions";

/** Read text from PDF, DOCX or TXT. Returns "" when the file has no text layer. */
export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".txt") || file.type === "text/plain") return await file.text();
    if (name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
      const mammoth = await import("mammoth/mammoth.browser");
      const { value } = await (mammoth as any).extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return typeof value === "string" ? value : "";
    }
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    return typeof text === "string" ? text : (text as string[]).join("\n");
  } catch {
    return "";
  }
}

export type PipelineOutcome = {
  parsed: ParsedResume;
  analysed: boolean;
  error?: string;
};

/**
 * Parses the uploaded file, stores extractive facts on the resume row, then runs
 * the AI ATS + roadmap + planner pipeline asynchronously.
 */
export async function processResumeUpload(opts: {
  file: File;
  resumeId: string;
  targetRole?: string | null;
}): Promise<PipelineOutcome> {
  const text = await extractResumeText(opts.file);
  const parsed = parseResumeText(text);

  await supabase
    .from("resumes")
    .update({
      parsed_text: text.slice(0, 200000),
      parsed: parsed as any,
      parsed_at: new Date().toISOString(),
    })
    .eq("id", opts.resumeId);

  if (!parsed.textExtracted) {
    return { parsed, analysed: false, error: "No readable text found in this file, so ATS analysis was skipped." };
  }

  try {
    await runResumePipeline({
      data: {
        resumeText: text,
        extracted: parsed,
        targetRole: opts.targetRole ?? null,
        resumeId: opts.resumeId,
      },
    });
    return { parsed, analysed: true };
  } catch (e: any) {
    return { parsed, analysed: false, error: e?.message ?? "AI analysis failed." };
  }
}

export type Analytics = {
  progressPercent: number;
  tasksCompleted: number;
  tasksTotal: number;
  streak: number;
  consistency: number;
  updatedAt: string;
};

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Recomputes analytics from real task rows and persists them on the profile. */
export async function recomputeAnalytics(): Promise<Analytics | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("is_done, completed_at, due_date, created_at")
    .eq("user_id", u.user.id);

  const list = tasks ?? [];
  const tasksTotal = list.length;
  const tasksCompleted = list.filter((t) => t.is_done).length;
  const progressPercent = tasksTotal ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  const doneDays = new Set(
    list.filter((t) => t.is_done && t.completed_at).map((t) => dayKey(t.completed_at as string)),
  );

  // Streak: consecutive days ending today (or yesterday) with a completion.
  let streak = 0;
  const cursor = new Date();
  if (!doneDays.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (doneDays.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Consistency: share of the last 30 days with at least one completed task.
  let active = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (doneDays.has(d.toISOString().slice(0, 10))) active++;
  }
  const consistency = Math.round((active / 30) * 100);

  const analytics: Analytics = {
    progressPercent,
    tasksCompleted,
    tasksTotal,
    streak,
    consistency,
    updatedAt: new Date().toISOString(),
  };

  await supabase.from("profiles").update({ analytics: analytics as any }).eq("id", u.user.id);
  return analytics;
}

/** Materialises the generated day-wise planner into real task rows (idempotent by title+date). */
export async function syncPlannerFromRoadmap(startDate = new Date()): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return 0;

  const { data: profile } = await supabase
    .from("profiles")
    .select("planner_plan")
    .eq("id", u.user.id)
    .maybeSingle();

  const plan = Array.isArray((profile as any)?.planner_plan) ? ((profile as any).planner_plan as any[]) : [];
  if (!plan.length) return 0;

  const rows: any[] = [];
  for (const day of plan) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (Number(day?.day) || 1) - 1);
    const due = d.toISOString().slice(0, 10);
    for (const t of Array.isArray(day?.tasks) ? day.tasks : []) {
      const title = typeof t === "string" ? t : String(t?.title ?? "");
      if (!title) continue;
      rows.push({
        user_id: u.user.id,
        title,
        category: (typeof t === "object" && t?.category) || "personal",
        due_date: due,
        priority: "medium",
        notes: "Auto-generated from your career roadmap",
      });
    }
  }
  if (!rows.length) return 0;

  const { data: existing } = await supabase
    .from("tasks")
    .select("title, due_date")
    .eq("user_id", u.user.id);
  const seen = new Set((existing ?? []).map((e) => `${e.title}|${e.due_date}`));
  const fresh = rows.filter((r) => !seen.has(`${r.title}|${r.due_date}`));
  if (!fresh.length) return 0;

  const { error } = await supabase.from("tasks").insert(fresh);
  if (error) throw new Error(error.message);
  return fresh.length;
}
