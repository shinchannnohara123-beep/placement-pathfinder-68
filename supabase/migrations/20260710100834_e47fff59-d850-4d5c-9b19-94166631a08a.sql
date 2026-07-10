
DROP POLICY IF EXISTS "companies auth insert" ON public.companies;
CREATE POLICY "companies auth insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
