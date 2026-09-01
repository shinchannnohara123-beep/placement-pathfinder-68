ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS field_sources jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.companies
SET min_cgpa = NULL,
    salary_min = NULL,
    salary_max = NULL,
    hiring_season = NULL,
    process_steps = NULL,
    allowed_branches = NULL,
    dsa_topics = NULL,
    cs_subjects = NULL
WHERE verification_status IS DISTINCT FROM 'verified';

UPDATE public.companies
SET verification_status = 'needs_verification'
WHERE verification_status NOT IN ('verified', 'needs_verification', 'unavailable', 'expired');

ALTER TABLE public.companies
  ALTER COLUMN verification_status SET DEFAULT 'needs_verification';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_verification_status_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_verification_status_check
  CHECK (verification_status IN ('verified', 'needs_verification', 'unavailable', 'expired'));