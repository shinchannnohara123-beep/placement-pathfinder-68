import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Trash2, Download, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({ meta: [{ title: "Resume — PlacementPilot" }] }),
  component: ResumePage,
});

type Resume = {
  id: string;
  label: string;
  file_path: string;
  size_bytes: number | null;
  is_primary: boolean;
  created_at: string;
};

function ResumePage() {
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Resume manager</h1>
        <p className="text-sm text-muted-foreground">Keep tailored versions ready. Star the one you send by default.</p>
      </div>

      <form onSubmit={upload} className="bento-card space-y-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Product-focused SWE" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file">PDF file</Label>
            <Input
              id="file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
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
          <div className="rounded-lg border border-dashed border-border bg-mist/50 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No resumes uploaded yet.</p>
          </div>
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