ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS parsed_text text,
  ADD COLUMN IF NOT EXISTS parsed jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parsed_at timestamp with time zone;