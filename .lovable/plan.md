# PlacementPilot — Expansion Plan

Goal: grow the current app into one connected career + academics + opportunities ecosystem, reusing the existing design language (Cloud White palette, Outfit/Figtree, `bento-card`, shadcn UI, collapsible sidebar). No redesign, no rebuild.

## What already exists and gets reused

- Sidebar shell + auth gate (`_authenticated/route.tsx`), sign-out flow
- `bento-card` styling, Progress, Badge, Tabs, Dialog, Table, Select, Sonner toasts, Chart (recharts) — all already installed
- Dashboard stat/list cards → refactored into shared `StatCard`, `WidgetCard`, `EmptyState`, `SectionHeader`
- Applications kanban → reused for opportunity/application status chips (`src/lib/format.ts` status tokens)
- Companies list + detail (eligibility panel) → becomes the "Companies" tab inside Opportunities
- Profile page → extended, becomes the single source of student data
- `ai.functions.ts` (Lovable AI + Firecrawl grounding) → reused for resume suggestions, mentor, verified fetches

## New shared components (built once, used everywhere)

`StatCard`, `WidgetCard`, `EmptyState`, `ProgressRing`, `TaskItem`, `ListingCard` (opportunities), `SourceBadge` (source name + URL + last-verified + verification status), `EligibilityBadge` (Eligible / Check Eligibility / Not Eligible + reason list), `MilestoneStep` (roadmap).

## Database entities (added per phase, not all at once)

- `profiles` — extend: university, current_semester, state, projects, certifications, coding_profiles, career_interests, preferred_roles
- `semesters` (sgpa, credits) and `subjects` (credits, progress, exam_date, difficulty, notes, marks, mapped_career_topic)
- `tasks` (title, category, date, time, priority, done) — powers Planner + dashboard "today"
- `roadmap_progress` (stage, status, progress, milestones)
- `resumes` extend + `resume_versions` (role, sections JSON, ai_suggested flags)
- `opportunities` (title, organization, category, eligibility JSON, deadline, location, source_name, source_url, last_verified_at, verification_status) + `saved_opportunities`
- `daily_quotes` — curated, attributed dataset; selected deterministically by date. No AI-generated quotes.

## Data accuracy approach

- Every externally sourced row (companies, opportunities) stores `source_name`, `source_url`, `last_verified_at`, `verification_status` (`verified` / `unverified` / `unavailable`). UI always renders `SourceBadge`.
- Fields the sources do not support are stored as `null` and rendered as "Information unavailable or not verified." — never inferred.
- AI (Firecrawl-grounded, as already implemented) may only summarize scraped source text; salaries, cutoffs, deadlines and eligibility are written only when present in a source.
- Eligibility is computed by explicit rules against the stored criteria, and always returns the reasons behind the verdict. Missing criteria → "Check Eligibility", never "Eligible".
- No seed/demo listings. Empty categories show a clean empty state.

## Navigation (grouped, no top-level sprawl)

```text
Dashboard
Academics      -> /academics        (tabs: CGPA, Subjects)
Career         -> /career           (tabs: Roadmap, Skills)
Planner        -> /planner          (Today / Week / Upcoming)
Resume Studio  -> /resume
Opportunities  -> /opportunities    (tabs: Companies, Jobs, Internships, Hackathons, Competitions, Exams, Scholarships)
Applications   -> /applications
Analytics      -> /analytics
Profile        -> /profile
AI Mentor      -> /mentor
```
Tabs inside a route keep the sidebar short and avoid duplicate pages.

## Build order

**Phase 1 — Foundation (profile-only data, no external sources)**
1. Migration: profile fields, `tasks`, `semesters`, `subjects`, `daily_quotes`
2. Shared component kit + extended Profile page
3. Academics hub: CGPA/SGPA calculators, target planning, semester table, subject tracker with subject→interview-topic mapping
4. Planner: Today/Week/Upcoming, reusable `TaskItem`
5. Dashboard upgrade: greeting, daily quote, today's tasks, deadlines, streak, next milestone

**Phase 2 — Career + Resume (derived from own data)**
6. Roadmap stages with status/progress/next action, personalized by branch, semester, skills
7. Resume Studio: sections auto-filled from profile, multiple versions, role targeting, AI suggestions clearly labelled and editable, preview built print-ready for later PDF export
8. Analytics: only real counts, each metric with an explanation line, empty states otherwise

**Phase 3 — Verified external data**
9. `opportunities` schema + Opportunities hub UI with filters (category, state, eligibility, level, branch, grad year, deadline)
10. Firecrawl-grounded verified ingestion for opportunities, reusing the company pipeline; source metadata mandatory
11. State-wise eligibility engine with reasons, applied across companies and opportunities

## Technical notes

- Server work stays in `createServerFn` under `src/lib/*.functions.ts` with `requireSupabaseAuth`; RLS + GRANTs per table, all user data scoped to `auth.uid()`.
- Reads use TanStack Query with the existing query-key conventions.
- Numeric columns typed to match AI/user input (integer rounding pitfall already fixed) — GPA/credits stay `numeric`.

Each phase is a separate approval-friendly chunk; nothing existing gets rewritten beyond the dashboard/profile extensions listed above.
