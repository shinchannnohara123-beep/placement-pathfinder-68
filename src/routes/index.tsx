import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Rocket,
  Building2,
  Briefcase,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const features = [
  {
    icon: Building2,
    title: "Company Explorer",
    body: "Search a curated directory of top recruiters. See eligibility, process, tech stack, and salary in one glance.",
  },
  {
    icon: Briefcase,
    title: "Application Tracker",
    body: "A calm command centre for every OA, interview, and offer — with next-step reminders you actually notice.",
  },
  {
    icon: FileText,
    title: "Resume Manager",
    body: "Store versions per role, get an ATS-friendly score, and never send the wrong PDF again.",
  },
  {
    icon: Sparkles,
    title: "AI Mentor (soon)",
    body: "Ask questions about your progress, get study plans, and rehearse interviews with contextual feedback.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Rocket className="h-4 w-4" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">PlacementPilot</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/auth">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-mesh relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              A calmer way to prepare for placements
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight text-ink md:text-6xl">
              Land your dream offer,
              <br />
              <span className="text-primary">one clean day at a time.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              PlacementPilot is a personal command centre for campus placements —
              company research, applications, resume versions, and interview prep
              in a single tidy workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Start free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  See what's inside
                </Button>
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Free for students</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Google sign-in</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Your data stays yours</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature bento */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">The toolkit</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Everything a placement season needs, nothing it doesn't.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`bento-card ${i === 0 ? "md:col-span-4" : i === 1 ? "md:col-span-2" : i === 2 ? "md:col-span-3" : "md:col-span-3"}`}
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="bento-card gradient-mesh flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              Placement season starts sooner than you think.
            </h3>
            <p className="mt-2 text-muted-foreground">Set up your workspace in under a minute.</p>
          </div>
          <Link to="/auth">
            <Button size="lg" className="gap-2">Create your workspace <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} PlacementPilot</span>
          <span>Built with care for students on the hunt.</span>
        </div>
      </footer>
    </div>
  );
}
