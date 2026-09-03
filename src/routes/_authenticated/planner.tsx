import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, SectionHeader, StatCard, WidgetCard } from "@/components/widgets";
import { DemoDataCard } from "@/components/demo-data-card";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Planner — PlacementPilot" },
      { name: "description", content: "Plan study, DSA and placement tasks by day with priorities and categories." },
      { property: "og:title", content: "Planner — PlacementPilot" },
      { property: "og:description", content: "Plan study, DSA and placement tasks by day with priorities and categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlannerPage,
});

const CATEGORIES = [
  { value: "academics", label: "Academics" },
  { value: "dsa", label: "DSA / Coding" },
  { value: "placement", label: "Placement" },
  { value: "resume", label: "Resume" },
  { value: "personal", label: "Personal" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-mist text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-destructive/10 text-destructive",
};

type Task = {
  id: string;
  title: string;
  notes: string | null;
  category: string;
  due_date: string;
  due_time: string | null;
  priority: string;
  is_done: boolean;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

type FormState = {
  title: string;
  notes: string;
  due_date: string;
  due_time: string;
  priority: string;
  category: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  notes: "",
  due_date: today(),
  due_time: "",
  priority: "medium",
  category: "academics",
};

function PlannerPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!form.title.trim()) throw new Error("Task title is required");

      const payload = {
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        due_date: form.due_date || today(),
        due_time: form.due_time ? `${form.due_time}:00` : null,
        priority: form.priority,
        category: form.category,
      };

      if (editing) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({ ...payload, user_id: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Task updated" : "Task added");
      setOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save task"),
  });

  const toggle = useMutation({
    mutationFn: async (t: Task) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_done: !t.is_done, completed_at: !t.is_done ? new Date().toISOString() : null })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Could not update task"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete task"),
  });

  const list = tasks.data ?? [];
  const t = today();
  const groups = useMemo(() => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    return {
      overdue: list.filter((x) => !x.is_done && x.due_date < t),
      today: list.filter((x) => x.due_date === t),
      week: list.filter((x) => x.due_date > t && x.due_date <= weekEndStr),
      later: list.filter((x) => x.due_date > weekEndStr),
    };
  }, [list, t]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      notes: task.notes ?? "",
      due_date: task.due_date,
      due_time: task.due_time ? task.due_time.slice(0, 5) : "",
      priority: task.priority,
      category: task.category,
    });
    setOpen(true);
  };

  function TaskRow({ task }: { task: Task }) {
    return (
      <li className="flex items-start gap-3 py-3">
        <Checkbox
          checked={task.is_done}
          onCheckedChange={() => toggle.mutate(task)}
          className="mt-1"
          aria-label="Mark complete"
        />
        <div className="min-w-0 flex-1">
          <div className={`truncate font-medium ${task.is_done ? "text-muted-foreground line-through" : ""}`}>
            {task.title}
          </div>
          {task.notes ? <p className="text-xs text-muted-foreground">{task.notes}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{task.due_date}</span>
            {task.due_time ? <span>{task.due_time.slice(0, 5)}</span> : null}
            <Badge variant="secondary">{CATEGORIES.find((c) => c.value === task.category)?.label ?? task.category}</Badge>
            <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_TONE[task.priority] ?? "bg-mist"}`}>
              {task.priority}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(task)} aria-label="Edit task">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => remove.mutate(task.id)} aria-label="Delete task">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </li>
    );
  }

  function Group({ title, items }: { title: string; items: Task[] }) {
    if (items.length === 0) return null;
    return (
      <WidgetCard title={title} icon={CalendarDays}>
        <ul className="divide-y divide-border">
          {items.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      </WidgetCard>
    );
  }

  const doneCount = list.filter((x) => x.is_done).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SectionHeader
        title="Planner"
        description="Plan your day, week and upcoming placement work."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit task" : "Add task"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="task-title">Task title</Label>
                  <Input
                    id="task-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Solve 5 DSA problems"
                  />
                </div>
                <div>
                  <Label htmlFor="task-notes">Description</Label>
                  <Textarea
                    id="task-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional details"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="task-date">Date</Label>
                    <Input
                      id="task-date"
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="task-time">Time</Label>
                    <Input
                      id="task-time"
                      type="time"
                      value={form.due_time}
                      onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? "Saving…" : editing ? "Save changes" : "Add task"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="All tasks" value={list.length} />
        <StatCard label="Today" value={groups.today.length} />
        <StatCard label="Overdue" value={groups.overdue.length} />
        <StatCard label="Completed" value={doneCount} />
      </div>

      {tasks.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Add your first task to start planning your placement prep."
          action={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Task</Button>}
        />
      ) : (
        <div className="space-y-4">
          <Group title="Overdue" items={groups.overdue} />
          <Group title="Today" items={groups.today} />
          <Group title="Next 7 days" items={groups.week} />
          <Group title="Later" items={groups.later} />
        </div>
      )}

      <DemoDataCard />
    </div>
  );
}
