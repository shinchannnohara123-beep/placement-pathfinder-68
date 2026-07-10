import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  FileText,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, STATUS_TONE, type ApplicationStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PlacementPilot" }] }),
  component: DashboardPage,
});

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return { user: u.user, profile: data };
    },
  });

  const apps = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .order("applied_date", { ascending: false });
      return data ?? [];
    },
  });

  const companies = useQuery({
    queryKey: ["companies-count"],
    queryFn: async () => {
      const { count } = await supabase.from("companies").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const total = apps.data?.length ?? 0;
  const offers = apps.data?.filter((a) => a.status === "offer").length ?? 0;
  const interviews = apps.data?.filter((a) => a.status === "interview").length ?? 0;
  const readiness = Math.min(100, Math.round(total * 8 + interviews * 6 + offers * 20));

  const name =
    profile.data?.profile?.full_name ??
    profile.data?.user?.user_metadata?.full_name ??
    profile.data?.user?.email?.split("@")[0] ??
    "there";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{greet()},</p>
          <h1 className="truncate font-display text-3xl font-bold tracking-tight">{name} 👋</h1>
        </div>
        <Link to="/applications">
          <Button className="gap-2">Log new application <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <div className="bento-card md:col-span-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4 text-primary" /> Placement readiness
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div className="font-display text-5xl font-bold tracking-tight">{readiness}<span className="text-2xl text-muted-foreground">%</span></div>
            <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> keep going</Badge>
          </div>
          <Progress value={readiness} className="mt-4" />
          <p className="mt-3 text-xs text-muted-foreground">
            Score grows with applications, interviews, and offers logged. Add more to sharpen the signal.
          </p>
        </div>

        <div className="bento-card md:col-span-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Briefcase className="h-3.5 w-3.5" /> Applied</div>
          <div className="mt-2 font-display text-3xl font-bold">{total}</div>
        </div>
        <div className="bento-card md:col-span-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Interviews</div>
          <div className="mt-2 font-display text-3xl font-bold">{interviews}</div>
        </div>
        <div className="bento-card md:col-span-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> Offers</div>
          <div className="mt-2 font-display text-3xl font-bold">{offers}</div>
        </div>

        <div className="bento-card md:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Recent applications</h3>
            <Link to="/applications" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {apps.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (apps.data?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-mist/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">No applications yet.</p>
              <Link to="/applications"><Button size="sm" className="mt-3">Log your first</Button></Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {apps.data!.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.company_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.role}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[a.status as ApplicationStatus] ?? "bg-mist"}`}>
                    {STATUS_LABEL[a.status as ApplicationStatus] ?? a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bento-card md:col-span-2">
          <h3 className="font-display text-lg font-semibold">Quick actions</h3>
          <div className="mt-3 space-y-2">
            <Link to="/companies"><Button variant="outline" className="w-full justify-start gap-2"><Building2 className="h-4 w-4" /> Explore companies</Button></Link>
            <Link to="/applications"><Button variant="outline" className="w-full justify-start gap-2"><Briefcase className="h-4 w-4" /> Add application</Button></Link>
            <Link to="/resume"><Button variant="outline" className="w-full justify-start gap-2"><FileText className="h-4 w-4" /> Upload resume</Button></Link>
          </div>
          <div className="mt-4 rounded-lg bg-mist p-3 text-xs text-muted-foreground">
            {companies.data ?? 0} companies in the directory · updated weekly.
          </div>
        </div>
      </div>
    </div>
  );
}