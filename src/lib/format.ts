export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export const APPLICATION_STATUSES = [
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  oa: "OA / Test",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export const STATUS_TONE: Record<ApplicationStatus, string> = {
  applied: "bg-mist text-ink",
  oa: "bg-accent text-accent-foreground",
  interview: "bg-primary/10 text-primary",
  offer: "bg-emerald-500/10 text-emerald-700",
  rejected: "bg-destructive/10 text-destructive",
};