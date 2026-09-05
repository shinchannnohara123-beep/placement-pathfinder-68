DROP TABLE IF EXISTS public.guidance_requests CASCADE;
DROP TABLE IF EXISTS public.alumni_insights CASCADE;
DROP TABLE IF EXISTS public.alumni_profiles CASCADE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS resume_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ats_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS roadmap_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS planner_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analytics jsonb NOT NULL DEFAULT '{}'::jsonb;