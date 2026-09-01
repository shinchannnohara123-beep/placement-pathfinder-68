INSERT INTO public.companies
  (name, slug, website, careers_url, industry, description, hq_location, min_cgpa, allowed_branches, tech_stack, salary_min, salary_max, hiring_season, process_steps, dsa_topics, cs_subjects, source_name, source_url, last_verified_at, verification_status, field_sources)
VALUES
  ('Zoho', 'zoho', 'https://www.zoho.com', 'https://www.zoho.com/careers/',
   'Cloud-based business software',
   'Zoho develops cloud-based business software for a wide array of industries and departmental needs, offering a suite of 55+ products built for growing businesses. Its careers site states that Zoho hires people beyond credentialism and is a private company with no intention of going public.',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   'zoho.com', 'https://www.zoho.com/careers/', now(), 'verified',
   '{"industry":"https://www.zoho.com/careers/","description":"https://www.zoho.com/careers/"}'::jsonb),
  ('Freshworks', 'freshworks', 'https://www.freshworks.com', 'https://www.freshworks.com/company/careers/',
   'AI-first service software (SaaS)',
   'Freshworks provides AI-first service software to deliver customer and employee experiences, with flagship products Freshservice for IT service management and Freshdesk for customer support. Its official About page states it serves 74,000+ customers across 120+ countries.',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   'freshworks.com', 'https://www.freshworks.com/company/about/', now(), 'verified',
   '{"industry":"https://www.freshworks.com/company/about/","description":"https://www.freshworks.com/company/about/"}'::jsonb),
  ('Zerodha', 'zerodha', 'https://zerodha.com', 'https://careers.zerodha.com/',
   'Stock broking and financial services',
   'Zerodha pioneered the discount broking model in India, starting operations on 15 August 2010 to remove barriers of cost, support and technology for traders and investors. Its official About page states it is the biggest stock broker in India, with over 1.6 crore clients contributing more than 15% of Indian retail trading volumes.',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   'zerodha.com', 'https://zerodha.com/about/', now(), 'verified',
   '{"industry":"https://zerodha.com/about/","description":"https://zerodha.com/about/"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;