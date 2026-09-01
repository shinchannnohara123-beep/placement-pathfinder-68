import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Trash2, Download, Star, Plus, Save, User, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, WidgetCard, EmptyState, ProgressRing } from "@/components/widgets";
import { useProfile } from "@/lib/use-placement-data";
import { resumeCompleteness } from "@/lib/roadmap";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({
    meta: [
      { title: "Resume Studio — PlacementPilot" },
      { name: "description", content: "Build role-specific resume versions from your real profile data, with live preview and completeness scoring." },
      { property: "og:title", content: "Resume Studio — PlacementPilot" },
      { property: "og:description", content: "Build role-specific resume versions from your real profile data, with live preview and completeness scoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResumeStudioPage,
});

type Resume = {
  id: string;
  label: string;
  file_path: string;
  size_bytes: number | null;
  is_primary: boolean;
  created_at: string;
};

type Version = {
  id: string;
  label: string;
  target_role: string | null;
  sections: any;
  created_at: string;
};

type Entry = { title: string; org?: string; period?: string; description?: string; link?: string };

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const emptyEntry = (): Entry => ({ title: "", org: "", period: "", description: "", link: "" });

function ResumeStudioPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SectionHeader
        title="Resume Studio"
        description="Your profile is the single source of truth. Build role-specific versions from it — nothing is auto-invented."
      />
      <Tabs defaultValue="studio">
        <TabsList>
          <TabsTrigger value="studio">Studio</TabsTrigger>
          <TabsTrigger value="files">Uploaded PDFs</TabsTrigger>
        </TabsList>
        <TabsContent value="studio" className="mt-4">
          <Studio />
        </TabsContent>
        <TabsContent value="files" className="mt-4">
          <Uploads />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Studio() {
  const qc = useQueryClient();
  const profileQ = useProfile();
  const profile = profileQ.data;

  const versionsQ = useQuery({
    queryKey: ["resume_versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resume_versions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Version[];
    },
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [projects, setProjects] = useState<Entry[]>([]);
  const [experience, setExperience] = useState<Entry[]>([]);
  const [certifications, setCertifications] = useState<Entry[]>([]);
  const [summary, setSummary] = useState("");
  const [achievements, setAchievements] = useState("");

  const active = useMemo(
    () => versionsQ.data?.find((v) => v.id === activeId) ?? null,
    [versionsQ.data, activeId],
  );

  useEffect(() => {
    if (!versionsQ.data) return;
    if (!activeId && versionsQ.data.length) setActiveId(versionsQ.data[0].id);
  }, [versionsQ.data, activeId]);

  useEffect(() => {
    if (!active) return;
    const s = active.sections ?? {};
    setLabel(active.label);
    setTargetRole(active.target_role ?? "");
    setSummary(s.summary ?? "");
    setAchievements(s.achievements ?? profile?.achievements ?? "");
    setProjects(arr(s.projects).length ? arr(s.projects) : (arr(profile?.projects) as Entry[]));
    setCertifications(
      arr(s.certifications).length ? arr(s.certifications) : (arr(profile?.certifications) as Entry[]),
    );
    setExperience(arr(s.experience) as Entry[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const createVersion = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("resume_versions" as any)
        .insert({
          user_id: u.user.id,
          label: `Version ${(versionsQ.data?.length ?? 0) + 1}`,
          sections: {
            projects: arr(profile?.projects),
            certifications: arr(profile?.certifications),
            experience: [],
            achievements: profile?.achievements ?? "",
            summary: "",
          },
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Version;
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["resume_versions"] });
      setActiveId(v.id);
      toast.success("Version created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!active) throw new Error("No version selected");
      const { error } = await supabase
        .from("resume_versions" as any)
        .update({
          label: label || active.label,
          target_role: targetRole || null,
          sections: { projects, experience, certifications, achievements, summary },
        })
        .eq("id", active.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resume_versions"] });
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeVersion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resume_versions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["resume_versions"] });
    },
  });

  const draftVersion = active
    ? { ...active, sections: { projects, experience, certifications, achievements, summary } }
    : null;
  const { checks, percent } = resumeCompleteness(profile ?? null, draftVersion);

  if (profileQ.isLoading || versionsQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!profile) {
    return (
      <EmptyState
        title="Complete your profile first"
        description="Resume Studio builds only from information you have entered."
        action={<Link to="/profile"><Button size="sm">Go to profile</Button></Link>}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <WidgetCard title="Resume completeness" icon={Sparkles}>
          <div className="flex items-start gap-4">
            <ProgressRing value={percent} label="complete" />
            <ul className="flex-1 space-y-1 text-sm">
              {checks.map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-2">
                  <span className={c.done ? "" : "text-muted-foreground"}>{c.label}</span>
                  <span className={c.done ? "text-emerald-600" : "text-muted-foreground"}>
                    {c.done ? "Ready" : "Missing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {percent < 100 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Missing items come from your profile or this version — fill them in rather than inventing content.{" "}
              <Link to="/profile" className="text-primary hover:underline">Edit profile</Link>
            </p>
          ) : null}
        </WidgetCard>

        <WidgetCard
          title="Resume versions"
          icon={FileText}
          action={
            <Button size="sm" className="gap-1" onClick={() => createVersion.mutate()}>
              <Plus className="h-4 w-4" /> New version
            </Button>
          }
        >
          {(versionsQ.data?.length ?? 0) === 0 ? (
            <EmptyState title="No versions yet" description="Create a version to start tailoring your resume to a role." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {versionsQ.data!.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveId(v.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    v.id === activeId ? "border-primary bg-primary/10 text-primary" : "border-border"
                  }`}
                >
                  {v.label}
                  {v.target_role ? <span className="text-muted-foreground"> · {v.target_role}</span> : null}
                </button>
              ))}
            </div>
          )}
        </WidgetCard>

        {active ? (
          <>
            <WidgetCard title="Version details">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="SDE fresher" />
                </div>
                <div className="space-y-1.5">
                  <Label>Target role</Label>
                  <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Backend Engineer" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label>Summary (your own words)</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
              </div>
            </WidgetCard>

            <EntryEditor title="Projects" items={projects} setItems={setProjects} orgLabel="Tech / stack" />
            <EntryEditor title="Experience" items={experience} setItems={setExperience} orgLabel="Company" />
            <EntryEditor title="Certifications" items={certifications} setItems={setCertifications} orgLabel="Issuer" />

            <WidgetCard title="Achievements">
              <Textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} rows={3} />
            </WidgetCard>

            <div className="flex gap-2">
              <Button className="gap-2" onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save version"}
              </Button>
              <Button variant="ghost" onClick={() => removeVersion.mutate(active.id)}>Delete version</Button>
            </div>
          </>
        ) : null}
      </div>

      <div className="lg:col-span-2">
        <div className="sticky top-4 space-y-3">
          <WidgetCard title="Preview" icon={User}>
            <div className="space-y-4 rounded-lg border border-border bg-background p-4 text-sm">
              <div>
                <div className="font-display text-xl font-bold">{profile.full_name || "Your name"}</div>
                <div className="text-xs text-muted-foreground">
                  {[profile.email, profile.state].filter(Boolean).join(" · ") || "Add contact details in profile"}
                </div>
                {targetRole ? <div className="mt-1 text-xs text-primary">{targetRole}</div> : null}
              </div>

              {summary ? <p className="text-xs">{summary}</p> : null}

              <PreviewSection title="Education">
                {profile.college || profile.university || profile.branch ? (
                  <div>
                    <div className="font-medium">{profile.college || profile.university}</div>
                    <div className="text-xs text-muted-foreground">
                      {[profile.degree, profile.branch, profile.graduation_year && `Class of ${profile.graduation_year}`]
                        .filter(Boolean)
                        .join(" · ")}
                      {profile.cgpa != null ? ` · CGPA ${profile.cgpa}` : ""}
                    </div>
                  </div>
                ) : (
                  <Missing />
                )}
              </PreviewSection>

              <PreviewSection title="Skills">
                {arr(profile.skills).length ? (
                  <div className="flex flex-wrap gap-1">
                    {arr(profile.skills).map((s: string) => (
                      <span key={s} className="rounded-full bg-mist px-2 py-0.5 text-[11px]">{s}</span>
                    ))}
                  </div>
                ) : (
                  <Missing />
                )}
              </PreviewSection>

              <PreviewList title="Experience" items={experience} />
              <PreviewList title="Projects" items={projects} />
              <PreviewList title="Certifications" items={certifications} />

              <PreviewSection title="Achievements">
                {achievements ? <p className="text-xs whitespace-pre-line">{achievements}</p> : <Missing />}
              </PreviewSection>
            </div>
          </WidgetCard>
          <Progress value={percent} className="h-2" />
        </div>
      </div>
    </div>
  );
}

function Missing() {
  return (
    <p className="text-xs text-muted-foreground">
      Not provided —{" "}
      <Link to="/profile" className="text-primary hover:underline">add it in your profile</Link>.
    </p>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 border-b border-border pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function PreviewList({ title, items }: { title: string; items: Entry[] }) {
  const filled = items.filter((i) => i.title?.trim());
  return (
    <PreviewSection title={title}>
      {filled.length ? (
        <ul className="space-y-2">
          {filled.map((i, idx) => (
            <li key={idx}>
              <div className="font-medium">{i.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {[i.org, i.period].filter(Boolean).join(" · ")}
              </div>
              {i.description ? <p className="text-xs">{i.description}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nothing added yet.</p>
      )}
    </PreviewSection>
  );
}

function EntryEditor({
  title,
  items,
  setItems,
  orgLabel,
}: {
  title: string;
  items: Entry[];
  setItems: (v: Entry[]) => void;
  orgLabel: string;
}) {
  const update = (i: number, patch: Partial<Entry>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <WidgetCard
      title={title}
      action={
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setItems([...items, emptyEntry()])}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} added. Add only what's genuinely yours.</p>
      ) : (
        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Title" value={it.title ?? ""} onChange={(e) => update(i, { title: e.target.value })} />
                <Input placeholder={orgLabel} value={it.org ?? ""} onChange={(e) => update(i, { org: e.target.value })} />
                <Input placeholder="Period (e.g. 2025)" value={it.period ?? ""} onChange={(e) => update(i, { period: e.target.value })} />
              </div>
              <Textarea
                placeholder="Description"
                rows={2}
                value={it.description ?? ""}
                onChange={(e) => update(i, { description: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Input placeholder="Link (optional)" value={it.link ?? ""} onChange={(e) => update(i, { link: e.target.value })} />
                <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

function Uploads() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("Main resume");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resumes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Resume[];
    },
  });

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a PDF first");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const path = `${u.user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, {
      contentType: file.type || "application/pdf",
    });
    if (upErr) {
      setBusy(false);
      return toast.error(upErr.message);
    }
    const { error } = await supabase.from("resumes").insert({
      user_id: u.user.id,
      label,
      file_path: path,
      size_bytes: file.size,
      is_primary: (list.data?.length ?? 0) === 0,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Resume uploaded");
    setFile(null);
    setLabel("Main resume");
    qc.invalidateQueries({ queryKey: ["resumes"] });
  };

  const remove = useMutation({
    mutationFn: async (r: Resume) => {
      await supabase.storage.from("resumes").remove([r.file_path]);
      const { error } = await supabase.from("resumes").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Removed");
    },
  });

  const makePrimary = useMutation({
    mutationFn: async (r: Resume) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("resumes").update({ is_primary: false }).eq("user_id", u.user.id);
      const { error } = await supabase.from("resumes").update({ is_primary: true }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
  });

  const download = async (r: Resume) => {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(r.file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={upload} className="bento-card space-y-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Product-focused SWE" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file">PDF file</Label>
            <Input id="file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button type="submit" disabled={busy} className="gap-2">
          <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload"}
        </Button>
      </form>

      <div className="space-y-3">
        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState title="No resumes uploaded yet" description="Upload a PDF to keep a sendable copy handy." />
        ) : (
          list.data!.map((r) => (
            <div key={r.id} className="bento-card !py-4 flex items-center gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{r.label}</span>
                  {r.is_primary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      <Star className="h-3 w-3" /> primary
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.size_bytes ? `${(r.size_bytes / 1024).toFixed(0)} KB · ` : ""}
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              {!r.is_primary && (
                <Button variant="ghost" size="sm" onClick={() => makePrimary.mutate(r)}>Make primary</Button>
              )}
              <Button variant="outline" size="icon" onClick={() => download(r)} aria-label="Download">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(r)} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
