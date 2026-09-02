CREATE TABLE public.alumni_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  photo_url text,
  college text,
  branch text,
  graduation_year integer,
  current_company text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  role_title text,
  career_field text,
  skills text[] NOT NULL DEFAULT '{}',
  career_journey text,
  guidance_areas text[] NOT NULL DEFAULT '{}',
  mentoring_status text NOT NULL DEFAULT 'open',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alumni_mentoring_status_check CHECK (mentoring_status IN ('open','requests','unavailable'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_profiles TO authenticated;
GRANT ALL ON public.alumni_profiles TO service_role;
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alumni profiles readable" ON public.alumni_profiles FOR SELECT TO authenticated USING (is_public OR user_id = auth.uid());
CREATE POLICY "own alumni profile insert" ON public.alumni_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own alumni profile update" ON public.alumni_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own alumni profile delete" ON public.alumni_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER alumni_profiles_updated_at BEFORE UPDATE ON public.alumni_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.alumni_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id uuid NOT NULL REFERENCES public.alumni_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'advice',
  title text NOT NULL,
  content text NOT NULL,
  resources text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_insights TO authenticated;
GRANT ALL ON public.alumni_insights TO service_role;
ALTER TABLE public.alumni_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alumni insights readable" ON public.alumni_insights FOR SELECT TO authenticated USING (is_published OR user_id = auth.uid());
CREATE POLICY "own alumni insight insert" ON public.alumni_insights FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own alumni insight update" ON public.alumni_insights FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own alumni insight delete" ON public.alumni_insights FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER alumni_insights_updated_at BEFORE UPDATE ON public.alumni_insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.guidance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alumni_id uuid NOT NULL REFERENCES public.alumni_profiles(id) ON DELETE CASCADE,
  topic text NOT NULL,
  career_area text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guidance_status_check CHECK (status IN ('pending','accepted','declined','completed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidance_requests TO authenticated;
GRANT ALL ON public.guidance_requests TO service_role;
ALTER TABLE public.guidance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student reads own requests" ON public.guidance_requests FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "student creates requests" ON public.guidance_requests FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "student deletes own pending requests" ON public.guidance_requests FOR DELETE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "alumni reads received requests" ON public.guidance_requests FOR SELECT TO authenticated USING (alumni_id IN (SELECT id FROM public.alumni_profiles WHERE user_id = auth.uid()));
CREATE POLICY "alumni updates received requests" ON public.guidance_requests FOR UPDATE TO authenticated USING (alumni_id IN (SELECT id FROM public.alumni_profiles WHERE user_id = auth.uid())) WITH CHECK (alumni_id IN (SELECT id FROM public.alumni_profiles WHERE user_id = auth.uid()));
CREATE TRIGGER guidance_requests_updated_at BEFORE UPDATE ON public.guidance_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX alumni_profiles_company_idx ON public.alumni_profiles (company_id);
CREATE INDEX guidance_requests_alumni_idx ON public.guidance_requests (alumni_id);