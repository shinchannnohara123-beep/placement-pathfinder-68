import { supabase } from "@/integrations/supabase/client";

/**
 * DEMO / TEST data helpers.
 * Everything created here is scoped to the currently signed-in user (RLS enforces this)
 * and is clearly prefixed with DEMO_TAG so it can never be confused with real data,
 * and can be removed again in one click.
 *
 * No company data is created here — companies must always come from verified sources.
 */
export const DEMO_TAG = "[DEMO]";

const DEMO_SEMESTERS = [1, 2, 3, 4];

function iso(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function seedDemoData() {
  const userId = await currentUserId();
  if (!userId) throw new Error("You must be signed in to create demo data.");

  await clearDemoData();

  // Profile (demo academic/profile fields — full name is left untouched)
  await supabase
    .from("profiles")
    .update({
      college: `${DEMO_TAG} Demo Institute of Technology`,
      university: `${DEMO_TAG} Demo State University`,
      branch: "Computer Science",
      degree: "B.Tech",
      course: "B.Tech CSE",
      graduation_year: new Date().getFullYear() + 1,
      year_of_study: 3,
      current_semester: 5,
      cgpa: 8.24,
      target_cgpa: 8.75,
      state: "Madhya Pradesh",
      skills: ["JavaScript", "React", "SQL", "Python", "Data Structures"],
      career_interests: ["Software Engineering", "Data Engineering"],
      preferred_roles: ["Frontend Engineer", "SDE Intern"],
      achievements: `${DEMO_TAG} Finalist, campus hackathon 2025`,
      projects: [
        { name: `${DEMO_TAG} Placement Tracker`, description: "React + Postgres app to track applications.", link: "" },
        { name: `${DEMO_TAG} Sentiment Dashboard`, description: "Python NLP dashboard for product reviews.", link: "" },
      ],
      certifications: [
        { name: `${DEMO_TAG} SQL Fundamentals`, issuer: "Demo Academy", year: 2025 },
      ],
      coding_profiles: { leetcode: "demo-user", github: "demo-user" },
    })
    .eq("id", userId);

  // Semesters
  const sgpas = [7.8, 8.1, 8.35, 8.6];
  await supabase.from("semesters").insert(
    DEMO_SEMESTERS.map((n, i) => ({
      user_id: userId,
      semester_number: n,
      sgpa: sgpas[i]!,
      credits_earned: 22,
      total_credits: 24,
    })),
  );

  // Subjects
  const subjects = [
    { name: "Data Structures", code: "CS201", credits: 4, progress: 85, difficulty: 4, sem: 3 },
    { name: "Operating Systems", code: "CS301", credits: 4, progress: 60, difficulty: 3, sem: 4 },
    { name: "DBMS", code: "CS302", credits: 4, progress: 72, difficulty: 3, sem: 4 },
    { name: "Computer Networks", code: "CS303", credits: 3, progress: 40, difficulty: 4, sem: 4 },
  ];
  await supabase.from("subjects").insert(
    subjects.map((s) => ({
      user_id: userId,
      name: `${DEMO_TAG} ${s.name}`,
      code: s.code,
      credits: s.credits,
      semester_number: s.sem,
      progress: s.progress,
      difficulty: s.difficulty,
      exam_date: iso(20 + s.sem),
      notes: `${DEMO_TAG} sample subject for testing`,
      topics: ["Unit 1", "Unit 2", "Unit 3"],
      interview_topics: ["Core concepts", "Problem solving"],
    })),
  );

  // Planner tasks
  const tasks = [
    { title: "Solve 5 array problems", category: "dsa", day: 0, priority: "high", done: false, time: "09:30:00" },
    { title: "Revise OS scheduling", category: "academics", day: 0, priority: "medium", done: true, time: "18:00:00" },
    { title: "Mock interview practice", category: "placement", day: 1, priority: "high", done: false, time: "11:00:00" },
    { title: "Update resume summary", category: "resume", day: 2, priority: "medium", done: false, time: null },
    { title: "Read DBMS indexing notes", category: "academics", day: -1, priority: "low", done: true, time: null },
    { title: "Apply to 3 openings", category: "placement", day: 3, priority: "high", done: false, time: "16:00:00" },
  ];
  await supabase.from("tasks").insert(
    tasks.map((t) => ({
      user_id: userId,
      title: `${DEMO_TAG} ${t.title}`,
      category: t.category,
      due_date: iso(t.day),
      due_time: t.time,
      priority: t.priority,
      notes: `${DEMO_TAG} sample planner task`,
      is_done: t.done,
      completed_at: t.done ? new Date().toISOString() : null,
    })),
  );

  // Roadmap progress
  await supabase.from("roadmap_progress").insert([
    { user_id: userId, stage_key: "foundation", status: "completed", progress: 100, completed_milestones: [`${DEMO_TAG} basics`] },
    { user_id: userId, stage_key: "dsa", status: "in_progress", progress: 55, completed_milestones: [`${DEMO_TAG} arrays`] },
  ]);

  // Resume version
  await supabase.from("resume_versions").insert({
    user_id: userId,
    label: `${DEMO_TAG} SDE Intern resume`,
    target_role: "Software Engineer Intern",
    sections: {
      summary: `${DEMO_TAG} Third-year CSE student focused on backend and product engineering.`,
      skills: ["React", "TypeScript", "SQL", "Python"],
      projects: [`${DEMO_TAG} Placement Tracker`, `${DEMO_TAG} Sentiment Dashboard`],
    },
  });

  return { ok: true };
}

export async function clearDemoData() {
  const userId = await currentUserId();
  if (!userId) throw new Error("You must be signed in.");

  await supabase.from("tasks").delete().eq("user_id", userId).like("title", `${DEMO_TAG}%`);
  await supabase.from("subjects").delete().eq("user_id", userId).like("name", `${DEMO_TAG}%`);
  await supabase.from("resume_versions").delete().eq("user_id", userId).like("label", `${DEMO_TAG}%`);
  await supabase
    .from("semesters")
    .delete()
    .eq("user_id", userId)
    .in("semester_number", DEMO_SEMESTERS);
  await supabase
    .from("roadmap_progress")
    .delete()
    .eq("user_id", userId)
    .in("stage_key", ["foundation", "dsa"]);

  return { ok: true };
}

export async function hasDemoData() {
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .like("title", `${DEMO_TAG}%`);
  return (count ?? 0) > 0;
}
