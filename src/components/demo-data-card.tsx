import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WidgetCard } from "@/components/widgets";
import { clearDemoData, hasDemoData, seedDemoData } from "@/lib/demo-data";

export function DemoDataCard() {
  const qc = useQueryClient();
  const present = useQuery({ queryKey: ["demo-data"], queryFn: hasDemoData });

  const refresh = () => qc.invalidateQueries();

  const seed = useMutation({
    mutationFn: seedDemoData,
    onSuccess: () => {
      toast.success("Demo data created for your account");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create demo data"),
  });

  const clear = useMutation({
    mutationFn: clearDemoData,
    onSuccess: () => {
      toast.success("Demo data removed");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove demo data"),
  });

  return (
    <WidgetCard
      title="Demo / test data"
      icon={FlaskConical}
      action={present.data ? <Badge variant="secondary">Demo data active</Badge> : undefined}
    >
      <p className="text-sm text-muted-foreground">
        Populate <strong>your own account only</strong> with clearly marked <code>[DEMO]</code> academics,
        subjects, planner tasks, roadmap progress and a resume version, so you can see the app with real-looking
        data. No company data is created — companies always come from verified sources.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>
          {seed.isPending ? "Creating…" : "Create demo data"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => clear.mutate()}
          disabled={clear.isPending}
        >
          <Trash2 className="h-4 w-4" /> Remove demo data
        </Button>
      </div>
    </WidgetCard>
  );
}
