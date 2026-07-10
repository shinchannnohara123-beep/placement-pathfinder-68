import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { APPLICATION_STATUSES, STATUS_LABEL, STATUS_TONE, type ApplicationStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "Applications — PlacementPilot" }] }),
  component: ApplicationsPage,
});

type Application = {
  id: string;
  company_name: string;
  role: string;
  status: ApplicationStatus;
  applied_date: string | null;
  location: string | null;
  package_lpa: number | null;
  notes: string | null;
};

function ApplicationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const apps = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*").order("applied_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Application[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Removed");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">Every OA, interview, and offer in one place.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <NewApplicationDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {APPLICATION_STATUSES.map((status) => {
          const items = (apps.data ?? []).filter((a) => a.status === status);
          return (
            <div key={status} className="bento-card !p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((a) => (
                  <div key={a.id} className="group rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{a.company_name}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.role}</div>
                      </div>
                      <button
                        onClick={() => remove.mutate(a.id)}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {a.package_lpa && (
                      <div className="mt-1 text-xs text-primary">{a.package_lpa} LPA</div>
                    )}
                    <Select
                      value={a.status}
                      onValueChange={(v) => updateStatus.mutate({ id: a.id, status: v as ApplicationStatus })}
                    >
                      <SelectTrigger className="mt-2 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLICATION_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewApplicationDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("applied");
  const [pkg, setPkg] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("applications").insert({
      user_id: u.user.id,
      company_name: company,
      role,
      status,
      package_lpa: pkg ? Number(pkg) : null,
      location: location || null,
      notes: notes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Application logged");
    qc.invalidateQueries({ queryKey: ["applications"] });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Log an application</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input id="company" required value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Input id="role" required placeholder="SDE Intern" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg">Package (LPA)</Label>
            <Input id="pkg" type="number" step="0.1" value={pkg} onChange={(e) => setPkg(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc">Location</Label>
          <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}