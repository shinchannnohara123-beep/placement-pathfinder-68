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

async function firecrawlSearch(query: string): Promise<string> {
  const lovKey = process.env.LOVABLE_API_KEY;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!lovKey || !fcKey) return "";
  try {
    const res = await fetch(`${FIRECRAWL_GATEWAY}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovKey}`,
        "X-Connection-Api-Key": fcKey,
      },
      body: JSON.stringify({
        query,
        limit: 5,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!res.ok) {
      console.error("Firecrawl search failed", res.status, await res.text().catch(() => ""));
      return "";
    }
    const json = (await res.json()) as {
      data?: Array<{ url?: string; title?: string; description?: string; markdown?: string }>;
    };
    const items = json.data ?? [];
    return items
      .map((r, i) => {
        const body = (r.markdown ?? r.description ?? "").slice(0, 2500);
        return `--- SOURCE ${i + 1}: ${r.title ?? ""} (${r.url ?? ""}) ---\n${body}`;
      })
      .join("\n\n")
      .slice(0, 14000);
  } catch (err) {
    console.error("Firecrawl search error", err);
    return "";
  }
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

    // 1) Pull real web sources via Firecrawl
    const [overview, placement] = await Promise.all([
      firecrawlSearch(`${data.name} company official website careers headquarters industry`),
      firecrawlSearch(`${data.name} India campus placement eligibility CGPA cutoff hiring process salary LPA branches`),
    ]);
    const sources = [overview, placement].filter(Boolean).join("\n\n");

    if (!sources) {
      throw new Error("Could not fetch live web data for this company. Try again shortly.");
    }

    const prompt = `You are a placement research analyst. Using ONLY the web sources provided below, extract accurate, verifiable information about "${data.name}" for Indian campus placements. Do NOT invent facts. If a field is not supported by the sources, set it to null. Return ONLY a JSON object with this shape:
{
  "name": string,
  "industry": string,
  "description": string (2-3 sentences),
  "website": string,
  "careers_url": string,
  "hq_location": string,
  "min_cgpa": number|null (typical campus cutoff, e.g. 7.0),
  "allowed_branches": string[] (e.g. ["CSE","IT","ECE"]),
  "tech_stack": string[],
  "salary_min": number|null (LPA, integer),
  "salary_max": number|null (LPA, integer),
  "hiring_season": string (e.g. "Autumn 2025"),
  "process_steps": string[] (ordered),
  "dsa_topics": string[],
  "cs_subjects": string[]
}
No prose, no markdown, JSON only.

WEB SOURCES:
${sources}`;

    const result = await callGateway({
      messages: [
        { role: "system", content: "You output strict JSON only. Ground every field in the provided web sources; use null when unsupported." },
        { role: "user", content: prompt },
      ],
    });
    const content = result.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content) as Record<string, unknown>;

    const row = {
      slug,
      name: (parsed.name as string) || data.name,
      industry: (parsed.industry as string) ?? null,
      description: (parsed.description as string) ?? null,
      website: (parsed.website as string) ?? null,
      careers_url: (parsed.careers_url as string) ?? null,
      hq_location: (parsed.hq_location as string) ?? null,
      min_cgpa: (parsed.min_cgpa as number) ?? null,
      allowed_branches: (parsed.allowed_branches as string[]) ?? null,
      tech_stack: (parsed.tech_stack as string[]) ?? null,
      salary_min: parsed.salary_min != null ? Math.round(Number(parsed.salary_min)) : null,
      salary_max: parsed.salary_max != null ? Math.round(Number(parsed.salary_max)) : null,
      hiring_season: (parsed.hiring_season as string) ?? null,
      process_steps: (parsed.process_steps as string[]) ?? null,
      dsa_topics: (parsed.dsa_topics as string[]) ?? null,
      cs_subjects: (parsed.cs_subjects as string[]) ?? null,
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