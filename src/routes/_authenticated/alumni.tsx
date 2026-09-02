import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Search,
  GraduationCap,
  Building2,
  Sparkles,
  Inbox,
  Send,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, SectionHeader, WidgetCard } from "@/components/widgets";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/format";
import {
  MENTORING_LABEL,
  MENTORING_TONE,
  INSIGHT_CATEGORIES,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  type AlumniProfile,
  type AlumniInsight,
  type GuidanceRequest,
  type MentoringStatus,
} from "@/lib/alumni";

export const Route = createFileRoute("/_authenticated/alumni")({
  head: () => ({
    meta: [
      { title: "Alumni Connect — PlacementPilot" },
      {
        name: "description",
        content:
          "Find alumni from your college network, read their real placement insights, and send guidance requests.",
      },
      { property: "og:title", content: "Alumni Connect — PlacementPilot" },
      {
        property: "og:description",
        content: "Search verified alumni profiles and request one-to-one placement guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlumniPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Failed to load Alumni Connect: {error.message}</div>
  ),
});

const ANY = "__any__";

function useUserId() {
  return useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
}

function AlumniPage() {
  const qc = useQueryClient();
  const me = useUserId();
  const userId = me.data ?? null;

  const alumni = useQuery({
    queryKey: ["alumni-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alumni_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AlumniProfile[];
    },
  });

  const myProfile = useMemo(
    () => (alumni.data ?? []).find((a) => a.user_id === userId) ?? null,
    [alumni.data, userId],
  );

  const insights = useQuery({
    queryKey: ["alumni-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alumni_insights")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AlumniInsight[];
    },
  });

  const requests = useQuery({
    queryKey: ["guidance-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guidance_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuidanceRequest[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["alumni-profiles"] });
    qc.invalidateQueries({ queryKey: ["alumni-insights"] });
    qc.invalidateQueries({ queryKey: ["guidance-requests"] });
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<AlumniProfile | null>(null);

  const sent = (requests.data ?? []).filter((r) => r.student_id === userId);
  const received = myProfile
    ? (requests.data ?? []).filter((r) => r.alumni_id === myProfile.id)
    : [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alumni Connect"
        description="Real alumni profiles, insights and guidance — only what alumni choose to share."
        action={
          <div className="flex gap-2">
            {myProfile ? (
              <Button variant="outline" className="gap-2" onClick={() => setInsightOpen(true)}>
                <Plus className="h-4 w-4" /> Share insight
              </Button>
            ) : null}
            <Button className="gap-2" onClick={() => setProfileOpen(true)}>
              <Pencil className="h-4 w-4" />
              {myProfile ? "Edit alumni profile" : "Join as alumni"}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory" className="gap-1.5">
            <Users className="h-4 w-4" /> Directory
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Insights
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5">
            <Inbox className="h-4 w-4" /> Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-4">
          <Directory
            loading={alumni.isLoading}
            alumni={alumni.data ?? []}
            insights={insights.data ?? []}
            userId={userId}
            onJoin={() => setProfileOpen(true)}
            onRequest={(a) => setRequestTarget(a)}
          />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <InsightsTab
            insights={insights.data ?? []}
            alumni={alumni.data ?? []}
            userId={userId}
            hasProfile={!!myProfile}
            onShare={() => setInsightOpen(true)}
            onDeleted={invalidate}
          />
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-4">
          <RequestsTab
            sent={sent}
            received={received}
            alumni={alumni.data ?? []}
            hasProfile={!!myProfile}
            onChanged={invalidate}
          />
        </TabsContent>
      </Tabs>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        existing={myProfile}
        userId={userId}
        onSaved={invalidate}
      />
      <InsightDialog
        open={insightOpen}
        onOpenChange={setInsightOpen}
        alumniId={myProfile?.id ?? null}
        userId={userId}
        onSaved={invalidate}
      />
      <RequestDialog
        target={requestTarget}
        onOpenChange={(o) => !o && setRequestTarget(null)}
        userId={userId}
        onSaved={invalidate}
      />
    </div>
  );
}

/* ---------------- Directory ---------------- */

function Directory({
  loading,
  alumni,
  insights,
  userId,
  onJoin,
  onRequest,
}: {
  loading: boolean;
  alumni: AlumniProfile[];
  insights: AlumniInsight[];
  userId: string | null;
  onJoin: () => void;
  onRequest: (a: AlumniProfile) => void;
}) {
  const [q, setQ] = useState("");
  const [company, setCompany] = useState(ANY);
  const [branch, setBranch] = useState(ANY);
  const [year, setYear] = useState(ANY);
  const [field, setField] = useState(ANY);
  const [mentoringOnly, setMentoringOnly] = useState(false);

  const uniq = (vals: (string | number | null)[]) =>
    Array.from(new Set(vals.filter((v): v is string | number => v !== null && v !== ""))).map(String).sort();

  const companies = uniq(alumni.map((a) => a.current_company));
  const branches = uniq(alumni.map((a) => a.branch));
  const years = uniq(alumni.map((a) => a.graduation_year)).sort((a, b) => Number(b) - Number(a));
  const fields = uniq(alumni.map((a) => a.career_field));

  const filtered = alumni.filter((a) => {
    const needle = q.trim().toLowerCase();
    const hay = [a.full_name, a.current_company, a.role_title, a.career_field, a.college, a.branch, ...(a.skills ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (needle && !hay.includes(needle)) return false;
    if (company !== ANY && a.current_company !== company) return false;
    if (branch !== ANY && a.branch !== branch) return false;
    if (year !== ANY && String(a.graduation_year ?? "") !== year) return false;
    if (field !== ANY && a.career_field !== field) return false;
    if (mentoringOnly && a.mentoring_status === "unavailable") return false;
    return true;
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading alumni…</p>;

  if (alumni.length === 0) {
    return (
      <EmptyState
        title="Be among the first alumni to join the PlacementPilot network."
        description="No alumni have shared a profile yet. Alumni data is only ever added by alumni themselves."
        action={
          <Button className="gap-2" onClick={onJoin}>
            <Plus className="h-4 w-4" /> Join as alumni
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bento-card space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, company, role or skill"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Company" value={company} onChange={setCompany} options={companies} />
          <FilterSelect label="Branch" value={branch} onChange={setBranch} options={branches} />
          <FilterSelect label="Graduation year" value={year} onChange={setYear} options={years} />
          <FilterSelect label="Career field" value={field} onChange={setField} options={fields} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={mentoringOnly} onCheckedChange={setMentoringOnly} />
          Open to mentoring only
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No alumni match these filters." description="Try clearing search or filters." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((a) => (
            <AlumniCard
              key={a.id}
              alumnus={a}
              insightCount={insights.filter((i) => i.alumni_id === a.id).length}
              isMe={a.user_id === userId}
              onRequest={() => onRequest(a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder={`All ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AlumniCard({
  alumnus: a,
  insightCount,
  isMe,
  onRequest,
}: {
  alumnus: AlumniProfile;
  insightCount?: number;
  isMe?: boolean;
  onRequest?: () => void;
}) {
  return (
    <div className="bento-card space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          {a.photo_url ? <AvatarImage src={a.photo_url} alt={a.full_name} /> : null}
          <AvatarFallback>{initials(a.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-lg font-semibold">{a.full_name}</h3>
            {isMe ? <Badge variant="secondary">You</Badge> : null}
            <Badge variant="secondary" className={MENTORING_TONE[a.mentoring_status]}>
              {MENTORING_LABEL[a.mentoring_status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {[a.role_title, a.current_company].filter(Boolean).join(" · ") || "Role not shared"}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            {a.college ? (
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> {a.college}
              </span>
            ) : null}
            {a.branch ? <span>{a.branch}</span> : null}
            {a.graduation_year ? <span>Class of {a.graduation_year}</span> : null}
            {a.career_field ? (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {a.career_field}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {a.career_journey ? <p className="text-sm leading-relaxed">{a.career_journey}</p> : null}

      {a.skills?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {a.skills.map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>
      ) : null}

      {a.guidance_areas?.length ? (
        <p className="text-xs text-muted-foreground">
          Guides on: <span className="text-foreground">{a.guidance_areas.join(", ")}</span>
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {insightCount ? `${insightCount} insight${insightCount > 1 ? "s" : ""} shared` : "No insights shared yet"}
        </span>
        {!isMe && onRequest ? (
          <Button
            size="sm"
            className="gap-2"
            disabled={a.mentoring_status === "unavailable"}
            onClick={onRequest}
          >
            <Send className="h-3.5 w-3.5" />
            {a.mentoring_status === "unavailable" ? "Unavailable" : "Request guidance"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- Insights ---------------- */

function InsightsTab({
  insights,
  alumni,
  userId,
  hasProfile,
  onShare,
  onDeleted,
}: {
  insights: AlumniInsight[];
  alumni: AlumniProfile[];
  userId: string | null;
  hasProfile: boolean;
  onShare: () => void;
  onDeleted: () => void;
}) {
  const nameOf = (id: string) => alumni.find((a) => a.id === id)?.full_name ?? "Alumni";

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alumni_insights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insight removed");
      onDeleted();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (insights.length === 0) {
    return (
      <EmptyState
        title="No alumni insights yet."
        description="Insights appear here only when alumni voluntarily share their own experience."
        action={
          hasProfile ? (
            <Button onClick={onShare} className="gap-2">
              <Plus className="h-4 w-4" /> Share an insight
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {insights.map((i) => (
        <WidgetCard key={i.id} title={i.title} icon={Sparkles}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {INSIGHT_CATEGORIES.find((c) => c.value === i.category)?.label ?? i.category}
            </Badge>
            <span>by {nameOf(i.alumni_id)}</span>
            <span>· {new Date(i.created_at).toLocaleDateString()}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{i.content}</p>
          {i.resources?.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {i.resources.map((r) => (
                <li key={r}>
                  <a
                    href={r}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary hover:underline"
                  >
                    {r}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {i.user_id === userId ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 gap-2 text-destructive"
              onClick={() => del.mutate(i.id)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          ) : null}
        </WidgetCard>
      ))}
    </div>
  );
}

/* ---------------- Requests ---------------- */

function RequestsTab({
  sent,
  received,
  alumni,
  hasProfile,
  onChanged,
}: {
  sent: GuidanceRequest[];
  received: GuidanceRequest[];
  alumni: AlumniProfile[];
  hasProfile: boolean;
  onChanged: () => void;
}) {
  const nameOf = (id: string) => alumni.find((a) => a.id === id)?.full_name ?? "Alumni";

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GuidanceRequest["status"] }) => {
      const { error } = await supabase.from("guidance_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WidgetCard title="Requests you sent" icon={Send}>
        {sent.length === 0 ? (
          <EmptyState title="No guidance requests sent yet." description="Open the directory and request guidance from an alumnus." />
        ) : (
          <ul className="space-y-3">
            {sent.map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{r.topic}</p>
                  <Badge variant="secondary" className={REQUEST_STATUS_TONE[r.status]}>
                    {REQUEST_STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  To {nameOf(r.alumni_id)}
                  {r.career_area ? ` · ${r.career_area}` : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.message}</p>
              </li>
            ))}
          </ul>
        )}
      </WidgetCard>

      <WidgetCard title="Requests you received" icon={Inbox}>
        {!hasProfile ? (
          <EmptyState
            title="Create an alumni profile to receive guidance requests."
            description="Students can only reach alumni who have joined the network."
          />
        ) : received.length === 0 ? (
          <EmptyState title="No guidance requests yet." />
        ) : (
          <ul className="space-y-3">
            {received.map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{r.topic}</p>
                  <Badge variant="secondary" className={REQUEST_STATUS_TONE[r.status]}>
                    {REQUEST_STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                {r.career_area ? <p className="text-xs text-muted-foreground">{r.career_area}</p> : null}
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => update.mutate({ id: r.id, status: "accepted" })}>
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => update.mutate({ id: r.id, status: "declined" })}
                      >
                        Decline
                      </Button>
                    </>
                  ) : r.status === "accepted" ? (
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, status: "completed" })}>
                      Mark completed
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </WidgetCard>
    </div>
  );
}

/* ---------------- Dialogs ---------------- */

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function ProfileDialog({
  open,
  onOpenChange,
  existing,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing: AlumniProfile | null;
  userId: string | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    photo_url: "",
    college: "",
    branch: "",
    graduation_year: "",
    current_company: "",
    role_title: "",
    career_field: "",
    skills: "",
    career_journey: "",
    guidance_areas: "",
    mentoring_status: "open" as MentoringStatus,
    is_public: true,
  });
  const [hydrated, setHydrated] = useState<string | null>(null);

  const key = existing?.id ?? "new";
  if (open && hydrated !== key) {
    setHydrated(key);
    setForm({
      full_name: existing?.full_name ?? "",
      photo_url: existing?.photo_url ?? "",
      college: existing?.college ?? "",
      branch: existing?.branch ?? "",
      graduation_year: existing?.graduation_year ? String(existing.graduation_year) : "",
      current_company: existing?.current_company ?? "",
      role_title: existing?.role_title ?? "",
      career_field: existing?.career_field ?? "",
      skills: (existing?.skills ?? []).join(", "),
      career_journey: existing?.career_journey ?? "",
      guidance_areas: (existing?.guidance_areas ?? []).join(", "),
      mentoring_status: existing?.mentoring_status ?? "open",
      is_public: existing?.is_public ?? true,
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("You must be signed in.");
      const name = form.full_name.trim();
      if (!name) throw new Error("Full name is required.");
      const year = form.graduation_year.trim() ? Number(form.graduation_year) : null;
      if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
        throw new Error("Graduation year must be a valid year.");
      }
      const payload = {
        user_id: userId,
        full_name: name.slice(0, 120),
        photo_url: form.photo_url.trim() || null,
        college: form.college.trim() || null,
        branch: form.branch.trim() || null,
        graduation_year: year,
        current_company: form.current_company.trim() || null,
        role_title: form.role_title.trim() || null,
        career_field: form.career_field.trim() || null,
        skills: splitList(form.skills),
        career_journey: form.career_journey.trim().slice(0, 2000) || null,
        guidance_areas: splitList(form.guidance_areas),
        mentoring_status: form.mentoring_status,
        is_public: form.is_public,
      };
      if (existing) {
        const { error } = await supabase.from("alumni_profiles").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("alumni_profiles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Alumni profile updated" : "Welcome to the alumni network");
      onOpenChange(false);
      setHydrated(null);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (k: keyof typeof form) => ({
    value: String(form[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit alumni profile" : "Join as alumni"}</DialogTitle>
          <DialogDescription>
            Only what you enter here is shared. You can hide your profile at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name *">
            <Input {...field("full_name")} placeholder="Your name" />
          </Field>
          <Field label="Profile photo URL">
            <Input {...field("photo_url")} placeholder="https://…" />
          </Field>
          <Field label="College">
            <Input {...field("college")} />
          </Field>
          <Field label="Branch">
            <Input {...field("branch")} placeholder="CSE" />
          </Field>
          <Field label="Graduation year">
            <Input {...field("graduation_year")} inputMode="numeric" placeholder="2023" />
          </Field>
          <Field label="Current company">
            <Input {...field("current_company")} />
          </Field>
          <Field label="Current role">
            <Input {...field("role_title")} placeholder="Software Engineer" />
          </Field>
          <Field label="Career field">
            <Input {...field("career_field")} placeholder="Software Engineering" />
          </Field>
          <Field label="Skills (comma separated)" full>
            <Input {...field("skills")} placeholder="Java, System Design, SQL" />
          </Field>
          <Field label="Areas of guidance (comma separated)" full>
            <Input {...field("guidance_areas")} placeholder="DSA, Resume review, Interviews" />
          </Field>
          <Field label="Short career journey" full>
            <Textarea rows={4} {...field("career_journey")} placeholder="How you got from college to your current role." />
          </Field>
          <Field label="Mentoring availability">
            <Select
              value={form.mentoring_status}
              onValueChange={(v) => setForm((f) => ({ ...f, mentoring_status: v as MentoringStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open to mentoring</SelectItem>
                <SelectItem value="requests">Available for guidance requests</SelectItem>
                <SelectItem value="unavailable">Currently unavailable</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Visibility">
            <label className="flex h-10 items-center gap-2 text-sm">
              <Switch
                checked={form.is_public}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))}
              />
              Visible in the directory
            </label>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function InsightDialog({
  open,
  onOpenChange,
  alumniId,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  alumniId: string | null;
  userId: string | null;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState(INSIGHT_CATEGORIES[0]!.value);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [resources, setResources] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!alumniId || !userId) throw new Error("Create your alumni profile first.");
      if (!title.trim() || !content.trim()) throw new Error("Title and content are required.");
      const { error } = await supabase.from("alumni_insights").insert({
        alumni_id: alumniId,
        user_id: userId,
        category,
        title: title.trim().slice(0, 160),
        content: content.trim().slice(0, 5000),
        resources: splitList(resources),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insight shared");
      setTitle("");
      setContent("");
      setResources("");
      onOpenChange(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share an insight</DialogTitle>
          <DialogDescription>Share only your own genuine experience and advice.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSIGHT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Your insight">
            <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          </Field>
          <Field label="Useful resources (comma separated links)">
            <Input value={resources} onChange={(e) => setResources(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestDialog({
  target,
  onOpenChange,
  userId,
  onSaved,
}: {
  target: AlumniProfile | null;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  onSaved: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [careerArea, setCareerArea] = useState("");
  const [message, setMessage] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!target || !userId) throw new Error("You must be signed in.");
      if (!topic.trim() || !message.trim()) throw new Error("Topic and message are required.");
      const { error } = await supabase.from("guidance_requests").insert({
        student_id: userId,
        alumni_id: target.id,
        topic: topic.trim().slice(0, 160),
        career_area: careerArea.trim() || null,
        message: message.trim().slice(0, 2000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guidance request sent");
      setTopic("");
      setCareerArea("");
      setMessage("");
      onOpenChange(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request guidance from {target?.full_name}</DialogTitle>
          <DialogDescription>
            Your request is stored privately and only visible to you and this alumnus.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Topic *">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Preparing for SDE interviews" />
          </Field>
          <Field label="Career area">
            <Input value={careerArea} onChange={(e) => setCareerArea(e.target.value)} placeholder="Software Engineering" />
          </Field>
          <Field label="Message *">
            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
