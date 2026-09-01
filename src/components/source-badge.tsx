import { ExternalLink, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type VerificationStatus = "verified" | "unverified" | "unavailable" | string | null;

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceBadge({
  sourceName,
  sourceUrl,
  lastVerifiedAt,
  status,
}: {
  sourceName?: string | null;
  sourceUrl?: string | null;
  lastVerifiedAt?: string | null;
  status?: VerificationStatus;
}) {
  const s = status ?? "needs_verification";
  const tone =
    s === "verified"
      ? "bg-emerald-500/10 text-emerald-700"
      : s === "unavailable" || s === "expired"
        ? "bg-destructive/10 text-destructive"
        : "bg-mist text-ink";
  const Icon = s === "verified" ? ShieldCheck : s === "unavailable" || s === "expired" ? ShieldAlert : ShieldQuestion;
  const label =
    s === "verified"
      ? "Verified"
      : s === "unavailable"
        ? "Unavailable"
        : s === "expired"
          ? "Expired"
          : "Needs verification";


  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="secondary" className={`gap-1 ${tone}`}>
        <Icon className="h-3 w-3" /> {label}
      </Badge>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {sourceName || hostOf(sourceUrl)} <ExternalLink className="h-3 w-3" />
        </a>
      ) : sourceName ? (
        <span>{sourceName}</span>
      ) : (
        <span>No source recorded</span>
      )}
      {lastVerifiedAt ? <span>· checked {new Date(lastVerifiedAt).toLocaleDateString()}</span> : null}
    </div>
  );
}
