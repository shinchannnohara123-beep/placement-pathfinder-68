import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const FIRECRAWL_GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callGateway(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as { choices: { message: { content: string } }[] };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  return JSON.parse(raw.slice(start, end + 1));
}

type FcResult = { url?: string; title?: string; description?: string; markdown?: string };

async function firecrawlCall(path: string, body: Record<string, unknown>) {
  const lovKey = process.env.LOVABLE_API_KEY;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!lovKey || !fcKey) return null;
  try {
    const res = await fetch(`${FIRECRAWL_GATEWAY}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovKey}`,
        "X-Connection-Api-Key": fcKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`Firecrawl ${path} failed`, res.status, await res.text().catch(() => ""));
      return null;
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.error(`Firecrawl ${path} error`, err);
    return null;
  }
}

const BLOCKED_HOSTS = [
  "wikipedia.org", "glassdoor", "ambitionbox", "indeed", "naukri", "quora", "reddit",
  "medium.com", "blogspot", "wordpress", "youtube", "facebook", "instagram", "twitter",
  "x.com", "geeksforgeeks", "prepinsta", "freshersworld", "shiksha", "collegedunia",
];

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isOfficialHost(url: string, company: string) {
  const host = hostOf(url);
  if (!host) return false;
  if (BLOCKED_HOSTS.some((b) => host.includes(b))) return false;
  const token = company.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!token) return false;
  const base = host.split(".")[0].replace(/[^a-z0-9]/g, "");
  return host.replace(/[^a-z0-9]/g, "").includes(token) || token.includes(base);
}

/** Finds the company's own domain, preferring results on an official-looking host. */
async function findOfficialSite(name: string): Promise<string | null> {
  const json = await firecrawlCall("/search", { query: `${name} official website`, limit: 8 });
  const items = ((json?.data as FcResult[] | undefined) ?? []).filter((r) => r.url);
  const official = items.find((r) => isOfficialHost(r.url!, name));
  if (!official?.url) return null;
  const host = hostOf(official.url);
  return host ? `https://${host}` : null;
}

async function scrapePage(url: string): Promise<{ url: string; markdown: string } | null> {
  const json = await firecrawlCall("/scrape", {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
  });
  if (!json) return null;
  const data = (json.data as Record<string, unknown> | undefined) ?? json;
  const markdown = typeof data.markdown === "string" ? data.markdown : "";
  if (!markdown.trim()) return null;
  return { url, markdown: markdown.slice(0, 12000) };
}

/** Discovers the official careers page on the company's own domain. */
async function findCareersUrl(site: string): Promise<string | null> {
  const json = await firecrawlCall("/map", { url: site, search: "careers", limit: 40 });
  const links = (json?.links as unknown[] | undefined) ?? [];
  const urls = links
    .map((l) => (typeof l === "string" ? l : ((l as { url?: string })?.url ?? "")))
    .filter((u) => typeof u === "string" && u);
  const preferred = urls.find((u) => /\/(careers|jobs|students|campus|university)/i.test(u));
  return preferred ?? urls[0] ?? null;
}


export const fetchAndAddCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { name?: string };
    if (!v?.name || typeof v.name !== "string" || v.name.trim().length < 2) {
      throw new Error("Company name is required");
    }
    return { name: v.name.trim().slice(0, 100) };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const slug = slugify(data.name);

    // If already exists, just return it
    const { data: existing } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) return existing;

    // 1) Official source first: company's own domain, then its careers page.
    const site = await findOfficialSite(data.name);
    if (!site) {
      throw new Error(
        `Could not confirm an official website for "${data.name}". Nothing was saved — we never store unverified company data.`,
      );
    }
    const careersUrl = await findCareersUrl(site);
    const pages = (
      await Promise.all([scrapePage(site), careersUrl ? scrapePage(careersUrl) : Promise.resolve(null)])
    ).filter(Boolean) as { url: string; markdown: string }[];

    if (pages.length === 0) {
      throw new Error(
        `The official site for "${data.name}" could not be read right now. Nothing was saved — we never store unverified company data.`,
      );
    }

    const sources = pages
      .map((p, i) => `--- OFFICIAL SOURCE ${i + 1}: ${p.url} ---\n${p.markdown}`)
      .join("\n\n");

    const prompt = `You are a data extraction engine. Extract ONLY facts that are explicitly stated in the OFFICIAL SOURCES below about "${data.name}". You must never guess, estimate, infer "typical" values, or use prior knowledge. If a field is not explicitly stated in the sources, it MUST be null (or an empty array). Salary, CGPA cutoffs, eligibility, hiring process, selection rounds, dates and required skills are especially sensitive: leave them null unless stated verbatim in the sources.

Return ONLY a JSON object:
{
  "industry": string|null,
  "description": string|null (2-3 sentences taken from the source content),
  "hq_location": string|null,
  "min_cgpa": number|null,
  "allowed_branches": string[],
  "tech_stack": string[],
  "salary_min": number|null (LPA),
  "salary_max": number|null (LPA),
  "hiring_season": string|null,
  "process_steps": string[],
  "dsa_topics": string[],
  "cs_subjects": string[],
  "field_sources": { "<field name>": "<the exact source URL that states it>" }
}
Only include a key in "field_sources" for fields you filled from a source. JSON only, no prose.

OFFICIAL SOURCES:
${sources}`;

    const result = await callGateway({
      messages: [
        {
          role: "system",
          content:
            "You output strict JSON only. You are an extractor, not an analyst: every value must be explicitly present in the supplied official sources, otherwise null.",
        },
        { role: "user", content: prompt },
      ],
    });
    const content = result.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content) as Record<string, unknown>;

    const officialUrls = new Set(pages.map((p) => p.url));
    const rawFieldSources = (parsed.field_sources as Record<string, string> | undefined) ?? {};
    // Validation: only keep facts attributed to a page we actually scraped.
    const fieldSources: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawFieldSources)) {
      if (typeof v === "string" && officialUrls.has(v)) fieldSources[k] = v;
    }
    const kept = <T>(field: string, value: T): T | null => (fieldSources[field] ? value : null);
    const keptList = (field: string, value: unknown): string[] | null => {
      const arr = Array.isArray(value) ? (value as string[]).filter((s) => typeof s === "string" && s.trim()) : [];
      return fieldSources[field] && arr.length ? arr : null;
    };

    const row = {
      slug,
      name: data.name,
      industry: kept("industry", (parsed.industry as string) ?? null),
      description: (parsed.description as string) ?? null,
      website: site,
      careers_url: careersUrl,
      hq_location: kept("hq_location", (parsed.hq_location as string) ?? null),
      min_cgpa: kept("min_cgpa", parsed.min_cgpa != null ? Number(parsed.min_cgpa) : null),
      allowed_branches: keptList("allowed_branches", parsed.allowed_branches),
      tech_stack: keptList("tech_stack", parsed.tech_stack),
      salary_min: kept("salary_min", parsed.salary_min != null ? Math.round(Number(parsed.salary_min)) : null),
      salary_max: kept("salary_max", parsed.salary_max != null ? Math.round(Number(parsed.salary_max)) : null),
      hiring_season: kept("hiring_season", (parsed.hiring_season as string) ?? null),
      process_steps: keptList("process_steps", parsed.process_steps),
      dsa_topics: keptList("dsa_topics", parsed.dsa_topics),
      cs_subjects: keptList("cs_subjects", parsed.cs_subjects),
      field_sources: fieldSources,
      source_name: hostOf(site),
      source_url: careersUrl ?? site,
      last_verified_at: new Date().toISOString(),
      verification_status: "verified",
    };


    const { data: inserted, error } = await supabase
      .from("companies")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const chatMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const v = input as { messages?: ChatMessage[] };
    if (!Array.isArray(v?.messages)) throw new Error("messages required");
    return {
      messages: v.messages.slice(-20).map((m) => ({
        role: m.role,
        content: String(m.content ?? "").slice(0, 4000),
      })),
    };
  })
  .handler(async ({ data, context }) => {
    // Fetch profile for personalization
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, college, branch, degree, course, year_of_study, cgpa, skills, achievements, dream_companies")
      .eq("id", context.userId)
      .maybeSingle();

    const system = `You are PlacementPilot Mentor — a warm, sharp AI career coach for Indian students preparing for placements & internships. Give concrete, actionable advice. Use markdown, short paragraphs, and bullet lists when helpful.

Student profile (may be partial): ${JSON.stringify(profile ?? {})}

Adapt guidance to their year, skills and target companies. If profile is empty, ask them to fill it in Profile page.`;

    const result = await callGateway({
      messages: [{ role: "system", content: system }, ...data.messages],
    });
    return { reply: result.choices?.[0]?.message?.content ?? "" };
  });