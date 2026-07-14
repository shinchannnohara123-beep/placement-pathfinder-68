import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, Briefcase, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchAndAddCompany } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({ meta: [{ title: "Companies — PlacementPilot" }] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const addCompany = useServerFn(fetchAndAddCompany);

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").order("name");
      return data ?? [];
    },
  });

  const list = (companies.data ?? []).filter((c) =>
    (c.name + " " + (c.industry ?? "") + " " + (c.tech_stack ?? []).join(" "))
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  async function onAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const c = await addCompany({ data: { name: newName.trim() } });
      toast.success(`Added ${c.name}`);
      qc.invalidateQueries({ queryKey: ["companies"] });
      setOpen(false);
      setNewName("");
      navigate({ to: "/companies/$slug", params: { slug: c.slug } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add company");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Research recruiters, eligibility, and process.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add company</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Add company with AI
              </DialogTitle>
              <DialogDescription>
                Type any company name. We'll fetch eligibility, tech stack, process, and typical package.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAdd();
                  }
                }}
                placeholder="e.g. Atlassian, Zerodha, Stripe"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={adding}>Cancel</Button>
              <Button onClick={onAdd} disabled={adding || !newName.trim()}>
                {adding ? "Fetching…" : "Fetch & add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search Google, Amazon, Fintech…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {companies.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading companies…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} to="/companies/$slug" params={{ slug: c.slug }} className="bento-card block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-semibold">{c.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">{c.industry}</p>
                </div>
                {c.min_cgpa ? (
                  <Badge variant="secondary" className="shrink-0">CGPA ≥ {c.min_cgpa}</Badge>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(c.tech_stack ?? []).slice(0, 3).map((t: string) => (
                  <span key={t} className="rounded-full bg-mist px-2 py-0.5 text-xs text-ink">{t}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.hq_location ?? "—"}</span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <Briefcase className="h-3 w-3" />
                  {c.salary_min && c.salary_max ? `${c.salary_min}–${c.salary_max} LPA` : "—"}
                </span>
              </div>
            </Link>
          ))}
          {list.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">No companies match "{q}".</p>
          )}
        </div>
      )}
    </div>
  );
}