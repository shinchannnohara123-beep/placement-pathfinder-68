import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatMentor } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({ meta: [{ title: "AI Mentor — PlacementPilot" }] }),
  component: MentorPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "How should I prepare for Google SDE in 3 months?",
  "Review my resume strategy for product-based companies",
  "I'm in 3rd year CSE — what's my roadmap?",
  "How do I handle a rejection after final round?",
];

function MentorPage() {
  const send = useServerFn(chatMentor);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await send({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply || "(no response)" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
      setMessages(next); // keep user msg
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" /> AI Mentor
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask anything about placements, prep strategy, resume, interviews, or offers.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-surface/40 p-4">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-lg border border-border bg-background p-3 text-left text-sm transition hover:border-primary/50 hover:bg-mist/40"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-mist/60 text-ink"
              }`}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mist text-ink">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-mist/60 px-4 py-2.5 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder="Ask your mentor anything…"
          rows={2}
          className="resize-none"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="gap-1.5">
          <Send className="h-4 w-4" /> Send
        </Button>
      </form>
    </div>
  );
}