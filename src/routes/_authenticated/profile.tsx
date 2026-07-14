import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — PlacementPilot" }] }),
  component: ProfilePage,
});

type ProfileForm = {
  full_name: string;
  college: string;
  degree: string;
  course: string;
  branch: string;
  year_of_study: string;
  graduation_year: string;
  cgpa: string;
  skills: string[];
  achievements: string;
  dream_companies: string[];
};

const EMPTY: ProfileForm = {
  full_name: "",
  college: "",
  degree: "",
  course: "",
  branch: "",
  year_of_study: "",
  graduation_year: "",
  cgpa: "",
  skills: [],
  achievements: "",
  dream_companies: [],
};

function ProfilePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [skillInput, setSkillInput] = useState("");
  const [dreamInput, setDreamInput] = useState("");
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["profile-full"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!q.data) return;
    setForm({
      full_name: q.data.full_name ?? "",
      college: q.data.college ?? "",
      degree: q.data.degree ?? "",
      course: q.data.course ?? "",
      branch: q.data.branch ?? "",
      year_of_study: q.data.year_of_study?.toString() ?? "",
      graduation_year: q.data.graduation_year?.toString() ?? "",
      cgpa: q.data.cgpa?.toString() ?? "",
      skills: q.data.skills ?? [],
      achievements: q.data.achievements ?? "",
      dream_companies: q.data.dream_companies ?? [],
    });
  }, [q.data]);

  const setField = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSave() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload = {
        id: u.user.id,
        full_name: form.full_name || null,
        college: form.college || null,
        degree: form.degree || null,
        course: form.course || null,
        branch: form.branch || null,
        year_of_study: form.year_of_study ? Number(form.year_of_study) : null,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
        cgpa: form.cgpa ? Number(form.cgpa) : null,
        skills: form.skills,
        achievements: form.achievements || null,
        dream_companies: form.dream_companies,
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["profile-full"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function addChip(list: "skills" | "dream_companies", value: string, setInput: (s: string) => void) {
    const v = value.trim();
    if (!v) return;
    setForm((f) => ({ ...f, [list]: Array.from(new Set([...f[list], v])) }));
    setInput("");
  }
  function removeChip(list: "skills" | "dream_companies", value: string) {
    setForm((f) => ({ ...f, [list]: f[list].filter((x) => x !== value) }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Your profile</h1>
        <p className="text-sm text-muted-foreground">
          Tell us about yourself so we can check company eligibility and give tailored mentoring.
        </p>
      </div>

      <div className="bento-card space-y-4">
        <h2 className="font-display text-lg font-semibold">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} />
          </Field>
          <Field label="College / University">
            <Input value={form.college} onChange={(e) => setField("college", e.target.value)} placeholder="IIT Bombay" />
          </Field>
        </div>
      </div>

      <div className="bento-card space-y-4">
        <h2 className="font-display text-lg font-semibold">Academics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Degree">
            <Input value={form.degree} onChange={(e) => setField("degree", e.target.value)} placeholder="B.Tech / M.Tech / BCA" />
          </Field>
          <Field label="Course / Program">
            <Input value={form.course} onChange={(e) => setField("course", e.target.value)} placeholder="Computer Science" />
          </Field>
          <Field label="Branch">
            <Input value={form.branch} onChange={(e) => setField("branch", e.target.value)} placeholder="CSE" />
          </Field>
          <Field label="Current year">
            <Input
              type="number"
              min={1}
              max={6}
              value={form.year_of_study}
              onChange={(e) => setField("year_of_study", e.target.value)}
              placeholder="3"
            />
          </Field>
          <Field label="Graduation year">
            <Input
              type="number"
              value={form.graduation_year}
              onChange={(e) => setField("graduation_year", e.target.value)}
              placeholder="2026"
            />
          </Field>
          <Field label="CGPA">
            <Input
              type="number"
              step="0.01"
              min={0}
              max={10}
              value={form.cgpa}
              onChange={(e) => setField("cgpa", e.target.value)}
              placeholder="8.5"
            />
          </Field>
        </div>
      </div>

      <div className="bento-card space-y-4">
        <h2 className="font-display text-lg font-semibold">Skills</h2>
        <ChipInput
          value={skillInput}
          onChange={setSkillInput}
          onAdd={() => addChip("skills", skillInput, setSkillInput)}
          placeholder="React, Python, DSA…"
        />
        <ChipList items={form.skills} onRemove={(v) => removeChip("skills", v)} />
      </div>

      <div className="bento-card space-y-4">
        <h2 className="font-display text-lg font-semibold">Dream companies</h2>
        <ChipInput
          value={dreamInput}
          onChange={setDreamInput}
          onAdd={() => addChip("dream_companies", dreamInput, setDreamInput)}
          placeholder="Google, Stripe…"
        />
        <ChipList items={form.dream_companies} onRemove={(v) => removeChip("dream_companies", v)} />
      </div>

      <div className="bento-card space-y-4">
        <h2 className="font-display text-lg font-semibold">Achievements</h2>
        <Textarea
          rows={4}
          value={form.achievements}
          onChange={(e) => setField("achievements", e.target.value)}
          placeholder="Hackathons won, open-source, papers, leadership…"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ChipInput({
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
      />
      <Button type="button" variant="secondary" onClick={onAdd}>
        Add
      </Button>
    </div>
  );
}

function ChipList({ items, onRemove }: { items: string[]; onRemove: (v: string) => void }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Nothing added yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Badge
          key={s}
          variant="secondary"
          className="cursor-pointer gap-1"
          onClick={() => onRemove(s)}
          title="Click to remove"
        >
          {s} <span className="text-muted-foreground">×</span>
        </Badge>
      ))}
    </div>
  );
}