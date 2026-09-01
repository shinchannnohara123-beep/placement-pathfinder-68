import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, CircleDashed, ArrowRight, Map } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, ProgressRing, WidgetCard, EmptyState } from "@/components/widgets";
import { usePlacementData } from "@/lib/use-placement-data";
import { roadmapOverall, type Stage } from "@/lib/roadmap";

export const Route = createFileRoute("/_authenticated/career")({
  head: () => ({
    meta: [
      { title: "Career Roadmap — PlacementPilot" },
      { name: "description", content: "Track your placement journey stage by stage, from fundamentals to your career goal." },
      { property: "og:title", content: "Career Roadmap — PlacementPilot" },
      { property: "og:description", content: "Track your placement journey stage by stage, from fundamentals to your career goal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CareerPage,
});

const STATUS_STYLE: Record<Stage["status"], string> = {
  not_started: "bg-mist text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-emerald-100 text-emerald-700",
};
const STATUS_LABEL: Record<Stage["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

function CareerPage() {
  const qc = useQueryClient();
  const { isLoading, stages, raw } = usePlacementData();
  const overall = roadmapOverall(stages);

  const toggle = useMutation({
    mutationFn: async ({ stage, key, next }: { stage: Stage; key: string; next: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const current = raw.manual[stage.key] ?? [];
      const completed = next ? [...new Set([...current, key])] : current.filter((k) => k !== key);
      const { error } = await supabase.from("roadmap_progress" as any).upsert(
        {
          user_id: u.user.id,
          stage_key: stage.key,
          status: stage.status,
          progress: stage.progress,
          completed_milestones: completed,
        },
        { onConflict: "user_id,stage_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap_progress"] }),
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const nextStage = stages.find((s) => s.status !== "completed");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SectionHeader
        title="Career Roadmap"
        description="Ten stages from fundamentals to offer. Progress is derived from your real profile, academics, and application data."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your roadmap…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <WidgetCard title="Overall progress" icon={Map} className="md:col-span-1">
              <div className="flex items-center gap-4">
                <ProgressRing value={overall} label="roadmap" />
                <div className="text-sm text-muted-foreground">
                  {stages.filter((s) => s.status === "completed").length} of {stages.length} stages completed
                </div>
              </div>
            </WidgetCard>
            <WidgetCard title="Next milestone" className="md:col-span-2">
              {nextStage ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{nextStage.title}</div>
                    <p className="font-display text-xl font-semibold">{nextStage.nextAction}</p>
                  </div>
                  {nextStage.link ? (
                    <Link to={nextStage.link.to}>
                      <Button size="sm" className="gap-2">
                        {nextStage.link.label} <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <EmptyState title="Every stage is complete" description="Keep your profile and applications up to date." />
              )}
            </WidgetCard>
          </div>

          <div className="space-y-4">
            {stages.map((stage, i) => (
              <div key={stage.key} className="bento-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent font-display text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold">{stage.title}</h3>
                      <p className="text-sm text-muted-foreground">{stage.blurb}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[stage.status]}`}>
                    {STATUS_LABEL[stage.status]}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Progress value={stage.progress} className="h-2" />
                  <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{stage.progress}%</span>
                </div>

                <ul className="mt-4 space-y-2">
                  {stage.milestones.map((ms) => (
                    <li key={ms.key} className="flex items-start gap-2 text-sm">
                      {ms.auto ? (
                        ms.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )
                      ) : (
                        <button
                          type="button"
                          aria-label={ms.done ? "Mark incomplete" : "Mark complete"}
                          onClick={() => toggle.mutate({ stage, key: ms.key, next: !ms.done })}
                          className="mt-0.5 shrink-0"
                        >
                          {ms.done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <span className={ms.done ? "text-muted-foreground line-through" : ""}>
                        {ms.label}
                        {!ms.auto && !ms.done && ms.hint ? (
                          <span className="ml-1 text-xs text-muted-foreground">({ms.hint})</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-mist p-3">
                  <p className="text-sm">
                    <span className="font-medium">Next action: </span>
                    {stage.nextAction}
                  </p>
                  {stage.link && stage.status !== "completed" ? (
                    <Link to={stage.link.to}>
                      <Button size="sm" variant="outline">
                        {stage.link.label}
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
