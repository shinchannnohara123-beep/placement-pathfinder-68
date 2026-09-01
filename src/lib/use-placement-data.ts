import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { computeRoadmap, type RoadmapData } from "@/lib/roadmap";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data ?? null;
    },
  });
}

async function list(table: string, order?: string) {
  const q = supabase.from(table as any).select("*");
  const { data, error } = order ? await q.order(order, { ascending: false }) : await q;
  if (error) return [];
  return (data ?? []) as any[];
}

export function usePlacementData() {
  const profile = useProfile();
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => list("subjects") });
  const semesters = useQuery({ queryKey: ["semesters"], queryFn: () => list("semesters") });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => list("tasks") });
  const applications = useQuery({ queryKey: ["applications"], queryFn: () => list("applications") });
  const resumes = useQuery({ queryKey: ["resumes"], queryFn: () => list("resumes", "created_at") });
  const resumeVersions = useQuery({ queryKey: ["resume_versions"], queryFn: () => list("resume_versions", "created_at") });
  const roadmapProgress = useQuery({ queryKey: ["roadmap_progress"], queryFn: () => list("roadmap_progress") });

  const manual: Record<string, string[]> = {};
  for (const row of roadmapProgress.data ?? []) {
    manual[row.stage_key] = Array.isArray(row.completed_milestones) ? row.completed_milestones : [];
  }

  const data: RoadmapData = {
    profile: profile.data ?? null,
    subjects: subjects.data ?? [],
    applications: applications.data ?? [],
    tasks: tasks.data ?? [],
    resumes: resumes.data ?? [],
    resumeVersions: resumeVersions.data ?? [],
    manual,
  };

  const isLoading =
    profile.isLoading ||
    subjects.isLoading ||
    tasks.isLoading ||
    applications.isLoading ||
    resumes.isLoading ||
    resumeVersions.isLoading ||
    roadmapProgress.isLoading;

  return {
    isLoading,
    raw: { ...data, semesters: semesters.data ?? [] },
    stages: computeRoadmap(data),
  };
}
