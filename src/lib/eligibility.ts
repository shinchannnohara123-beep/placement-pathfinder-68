export type EligibilityVerdict = "eligible" | "not_eligible" | "check";

export type EligibilityResult = {
  verdict: EligibilityVerdict;
  reasons: string[];
  missing: string[];
};

export type StudentFacts = {
  cgpa?: number | null;
  branch?: string | null;
  state?: string | null;
  graduation_year?: number | null;
  degree?: string | null;
};

export type Criteria = {
  min_cgpa?: number | null;
  allowed_branches?: string[] | null;
  branches?: string[] | null;
  state?: string | null;
  graduation_years?: number[] | null;
  education_level?: string | null;
};

function norm(v?: string | null) {
  return (v ?? "").trim().toLowerCase();
}

/**
 * Rule-based eligibility. Nothing is inferred: any criterion the listing does
 * not state, or any student fact that is missing, produces a "check" verdict
 * with an explicit reason instead of a pass.
 */
export function evaluateEligibility(student: StudentFacts, criteria: Criteria): EligibilityResult {
  const reasons: string[] = [];
  const missing: string[] = [];
  let failed = false;

  const branchList = criteria.allowed_branches ?? criteria.branches ?? null;

  if (criteria.min_cgpa != null) {
    if (student.cgpa == null) {
      missing.push("Add your CGPA in Profile to check the CGPA cutoff.");
    } else if (student.cgpa < Number(criteria.min_cgpa)) {
      failed = true;
      reasons.push(`CGPA ${student.cgpa} is below the stated cutoff of ${criteria.min_cgpa}.`);
    } else {
      reasons.push(`CGPA ${student.cgpa} meets the stated cutoff of ${criteria.min_cgpa}.`);
    }
  } else {
    missing.push("No CGPA cutoff is stated in the source.");
  }

  if (branchList && branchList.length) {
    if (!student.branch) {
      missing.push("Add your branch in Profile to check the branch criteria.");
    } else {
      const ok = branchList.some(
        (b) => norm(b) === norm(student.branch) || norm(student.branch).includes(norm(b)) || norm(b).includes(norm(student.branch)),
      );
      if (ok) reasons.push(`Branch ${student.branch} is in the eligible list.`);
      else {
        failed = true;
        reasons.push(`Branch ${student.branch} is not in the eligible list (${branchList.join(", ")}).`);
      }
    }
  } else {
    missing.push("No branch restriction is stated in the source.");
  }

  if (criteria.graduation_years && criteria.graduation_years.length) {
    if (student.graduation_year == null) {
      missing.push("Add your graduation year in Profile to check the batch criteria.");
    } else if (!criteria.graduation_years.includes(student.graduation_year)) {
      failed = true;
      reasons.push(`Batch ${student.graduation_year} is outside the stated batches (${criteria.graduation_years.join(", ")}).`);
    } else {
      reasons.push(`Batch ${student.graduation_year} matches the stated batches.`);
    }
  }

  if (criteria.state) {
    if (!student.state) {
      missing.push("Add your state in Profile to check the state-level criteria.");
    } else if (norm(criteria.state) !== "all india" && norm(criteria.state) !== norm(student.state)) {
      failed = true;
      reasons.push(`This is restricted to ${criteria.state}; your profile says ${student.state}.`);
    } else {
      reasons.push(`Open to students from ${criteria.state}.`);
    }
  }

  if (failed) return { verdict: "not_eligible", reasons, missing };
  if (missing.length) return { verdict: "check", reasons, missing };
  return { verdict: "eligible", reasons, missing };
}

export const VERDICT_LABEL: Record<EligibilityVerdict, string> = {
  eligible: "Eligible",
  not_eligible: "Not eligible",
  check: "Check eligibility",
};

export const VERDICT_TONE: Record<EligibilityVerdict, string> = {
  eligible: "bg-emerald-500/10 text-emerald-700",
  not_eligible: "bg-destructive/10 text-destructive",
  check: "bg-accent text-accent-foreground",
};
