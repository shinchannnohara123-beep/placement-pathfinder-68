import { Badge } from "@/components/ui/badge";
import { VERDICT_LABEL, VERDICT_TONE, type EligibilityResult } from "@/lib/eligibility";

export function EligibilityBadge({ result }: { result: EligibilityResult }) {
  return (
    <Badge variant="secondary" className={VERDICT_TONE[result.verdict]}>
      {VERDICT_LABEL[result.verdict]}
    </Badge>
  );
}

export function EligibilityReasons({ result }: { result: EligibilityResult }) {
  return (
    <ul className="space-y-1 text-sm">
      {result.reasons.map((r) => (
        <li key={r} className="text-muted-foreground">
          · {r}
        </li>
      ))}
      {result.missing.map((m) => (
        <li key={m} className="text-muted-foreground">
          ? {m}
        </li>
      ))}
      {!result.reasons.length && !result.missing.length ? (
        <li className="text-muted-foreground">No criteria recorded for this listing.</li>
      ) : null}
    </ul>
  );
}
