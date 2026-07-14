
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS degree text,
  ADD COLUMN IF NOT EXISTS year_of_study integer,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS achievements text;
