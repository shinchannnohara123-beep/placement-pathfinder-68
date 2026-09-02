export type MentoringStatus = "open" | "requests" | "unavailable";

export type AlumniProfile = {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  college: string | null;
  branch: string | null;
  graduation_year: number | null;
  current_company: string | null;
  company_id: string | null;
  role_title: string | null;
  career_field: string | null;
  skills: string[] | null;
  career_journey: string | null;
  guidance_areas: string[] | null;
  mentoring_status: MentoringStatus;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type AlumniInsight = {
  id: string;
  alumni_id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  resources: string[] | null;
  is_published: boolean;
  created_at: string;
};

export type GuidanceRequest = {
  id: string;
  student_id: string;
  alumni_id: string;
  topic: string;
  career_area: string | null;
  message: string;
  status: "pending" | "accepted" | "declined" | "completed";
  created_at: string;
};

export const MENTORING_LABEL: Record<MentoringStatus, string> = {
  open: "Open to mentoring",
  requests: "Available for guidance requests",
  unavailable: "Currently unavailable",
};

export const MENTORING_TONE: Record<MentoringStatus, string> = {
  open: "bg-emerald-500/10 text-emerald-700",
  requests: "bg-primary/10 text-primary",
  unavailable: "bg-mist text-muted-foreground",
};

export const INSIGHT_CATEGORIES = [
  { value: "preparation", label: "Placement preparation strategy" },
  { value: "journey", label: "Career journey" },
  { value: "interview", label: "Interview experience" },
  { value: "skills", label: "Recommended skills" },
  { value: "advice", label: "Advice for students" },
  { value: "resources", label: "Useful resources" },
] as const;

export const REQUEST_STATUS_LABEL: Record<GuidanceRequest["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
};

export const REQUEST_STATUS_TONE: Record<GuidanceRequest["status"], string> = {
  pending: "bg-mist text-ink",
  accepted: "bg-primary/10 text-primary",
  declined: "bg-destructive/10 text-destructive",
  completed: "bg-emerald-500/10 text-emerald-700",
};
