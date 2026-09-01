import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, CheckSquare, GraduationCap, Map, FileText, Briefcase, Flame } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SectionHeader, WidgetCard, StatCard, EmptyState, ProgressRing } from "@/components/widgets";
import { usePlacementData } from "@/lib/use-placement-data";
import { roadmapOverall, resumeCompleteness } from "@/lib/roadmap";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PlacementPilot" },
      { name: "description", content: "See real progress across tasks, academics, roadmap, resume, and applications." },
      { property: "og:title", content: "Analytics — PlacementPilot" },
      { property: "og:description", content: "See real progress across tasks, academics, roadmap, resume, and applications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function AnalyticsPage() {
  const { isLoading, raw, stages } = usePlacementData();
  const tasks = raw.tasks;
  const subjects = raw.subjects;
  const apps = raw.applications;

  const doneTasks = tasks.filter((t) => t.is_done);
  const taskRate = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  // Study consistency: completed tasks per day over the last 14 days
  const days: { key: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const count = doneTasks.filter((t) => (t.completed_at ?? "").slice(0, 10) === key).length;
    days.push({ key, label: d.toLocaleDateString(undefined, { weekday: "narrow" }), count });
  }
  const activeDays = days.filter((d) => d.count > 0).length;
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const subjectAvg = subjects.length
    ? Math.round(subjects.reduce((a, s) => a + (s.progress ?? 0), 0) / subjects.length)
    : 0;

  const roadmap = roadmapOverall(stages);
  const resume = resumeCompleteness(raw.profile, raw.resumeVersions[0] ?? null).percent;

  const statusCounts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const maxStatus = Math.max(1, ...Object.values(statusCounts));

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SectionHeader
        title="Analytics"
        description="Everything here is computed from data you have actually entered. Empty sections simply mean there's nothing logged yet."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tasks completed" value={`${doneTasks.length}/${tasks.length}`} icon={CheckSquare} hint={tasks.length ? `${taskRate}% completion rate` : "No tasks logged"} />
        <StatCard label="Active study days (14d)" value={activeDays} icon={Flame} hint={activeDays ? "Days with a completed task" : "No completed tasks yet"} />
        <StatCard label="Applications" value={apps.length} icon={Briefcase} hint={apps.length ? `${statusCounts["offer"] ?? 0} offers` : "None logged"} />
        <StatCard label="Subjects tracked" value={subjects.length} icon={GraduationCap} hint={subjects.length ? `${subjectAvg}% avg progress` : "None added"} />
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <WidgetCard title="Task completion" icon={CheckSquare} className="md:col-span-2">
          {tasks.length === 0 ? (
            <EmptyState title="No tasks yet" description="Tasks you add will be measured here." />
          ) : (
            <div className="flex items-center gap-4">
              <ProgressRing value={taskRate} label="done" />
              <div className="text-sm text-muted-foreground">
                {doneTasks.length} completed · {tasks.length - doneTasks.length} open
              </div>
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Study consistency (last 14 days)" icon={BarChart3} className="md:col-span-4">
          {doneTasks.length === 0 ? (
            <EmptyState title="Nothing completed yet" description="Complete tasks to build a consistency streak." />
          ) : (
            <div className="flex h-32 items-end gap-1.5">
              {days.map((d) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 6 : 2 }}
                    title={`${d.key}: ${d.count} completed`}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Academic / subject progress" icon={GraduationCap} className="md:col-span-3">
          {subjects.length === 0 ? (
            <EmptyState title="No subjects tracked" description="Add subjects to see per-subject progress." />
          ) : (
            <ul className="space-y-3">
              {subjects.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="truncate">{s.name}</span>
                    <span className="text-muted-foreground">{s.progress ?? 0}%</span>
                  </div>
                  <Progress value={s.progress ?? 0} className="h-2" />
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>

        <WidgetCard title="Application pipeline" icon={Briefcase} className="md:col-span-3">
          {apps.length === 0 ? (
            <EmptyState
              title="No applications logged"
              description="Track applications to see pipeline breakdowns."
              action={<Link to="/applications"><Button size="sm">Add application</Button></Link>}
            />
          ) : (
            <ul className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <li key={status}>
                  <div className="mb-1 flex justify-between text-sm capitalize">
                    <span>{status.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <Progress value={(count / maxStatus) * 100} className="h-2" />
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>

        <WidgetCard title="Career roadmap progress" icon={Map} className="md:col-span-3">
          <div className="flex items-center gap-4">
            <ProgressRing value={roadmap} label="roadmap" />
            <div className="flex-1 space-y-2">
              {stages.slice(0, 5).map((s) => (
                <div key={s.key}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="truncate">{s.title}</span>
                    <span className="text-muted-foreground">{s.progress}%</span>
                  </div>
                  <Progress value={s.progress} className="h-1.5" />
                </div>
              ))}
              <Link to="/career" className="inline-block text-xs text-primary hover:underline">View full roadmap</Link>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard title="Resume completion" icon={FileText} className="md:col-span-3">
          <div className="flex items-center gap-4">
            <ProgressRing value={resume} label="resume" />
            <div className="text-sm text-muted-foreground">
              {raw.resumeVersions.length} saved version{raw.resumeVersions.length === 1 ? "" : "s"} ·{" "}
              {raw.resumes.length} uploaded file{raw.resumes.length === 1 ? "" : "s"}
              <div className="mt-2">
                <Link to="/resume" className="text-xs text-primary hover:underline">Open Resume Studio</Link>
              </div>
            </div>
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
