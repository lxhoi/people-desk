export type Role = "admin" | "manager" | "employee";
export type JobStatus = "draft" | "published" | "unpublished";
export type StageKind = "review" | "test" | "interview";
export type CandidateOutcome = "active" | "hired" | "rejected";
export type EvaluationRating = "strong" | "meets" | "needs";
export type EmailTemplateKey =
  | "invite"
  | "reminder"
  | "confirmation"
  | "reject"
  | "offer"
  | "welcome";

export interface WorkflowStage {
  id: string;
  name: string;
  kind: StageKind;
  criteria: string;
}

export interface Workflow {
  id: string;
  name: string;
  stages: WorkflowStage[];
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  workflow: string;
  stages: WorkflowStage[];
  status: JobStatus;
}

export interface AssessmentQuestion {
  prompt: string;
  answer: string;
}

export interface Assessment {
  id: string;
  title: string;
  minutes: number;
  status: JobStatus;
  questions: AssessmentQuestion[];
}

export interface CandidateReview {
  rating: EvaluationRating;
  notes: string;
}

export interface CandidateTest {
  id?: string;
  title: string;
  minutes?: number;
  questions?: AssessmentQuestion[];
  stage: number;
  started?: number;
  expires?: number;
  submitted?: string;
  answers?: string[];
  draft?: string[];
  result?: "Passed" | "Failed" | "Pending review";
}

export interface CandidateInterview {
  stage: number;
  interviewer?: string;
  slots: string[];
  selected?: string;
  status: "Invited" | "Confirmed" | "Change requested" | "Completed" | "Cancelled";
  notes?: string;
}

export interface CandidateEvent {
  date: string;
  message: string;
}

export interface CandidateMessage {
  type: EmailTemplateKey | "assessment";
  date: string;
  subject: string;
  body: string;
}

export interface CandidateApplication {
  id: string;
  job: string;
  name: string;
  email: string;
  cv: string;
  answer: string;
  avatar?: string;
  token: string;
  stages: WorkflowStage[];
  stage: number;
  outcome: CandidateOutcome;
  created: string;
  reviews: Record<number, CandidateReview>;
  tests: Record<number, CandidateTest>;
  interviews: Record<number, CandidateInterview>;
  events: CandidateEvent[];
  messages: CandidateMessage[];
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  department: string;
  lead: string;
  health: "On track" | "At risk" | "Needs review";
  phase: string;
  members: string[];
  deleted?: boolean;
}

export interface Task {
  id: string;
  project: string;
  name: string;
  type: "task" | "bug" | "story";
  status: "open" | "done";
  parent?: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  due: string;
  estimate: number;
  label: string;
  deleted?: boolean;
}

export interface TimeEntry {
  id: string;
  day: string;
  person: string;
  project: string;
  task: string;
  startTime: string;
  endTime: string;
  seconds: number;
  source: "Timer" | "Manual";
}

export interface ActiveTimer {
  project: string;
  task: string;
  start: number;
  pausedAt: number | null;
  pausedMs: number;
}

export interface PendingTimeEntry {
  project: string;
  task: string;
  day: string;
  startTime: string;
  endTime: string;
  seconds: number;
  source: "Timer" | "Manual";
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  project: string;
  sender: string;
  recipient: string;
  service: string;
  seconds: number;
  status: "Sent" | "Paid" | "Overdue";
  currency: string;
  rate: number;
  amount: number;
}

export interface LeaveRequest {
  id: string;
  person: string;
  from: string;
  to: string;
  type: string;
  status: "Approved" | "Pending" | "Rejected";
  notes: string;
}

export interface HiringState {
  workflows: Workflow[];
  jobs: Job[];
  tests: Assessment[];
  templates: Record<EmailTemplateKey, EmailTemplate>;
  applications: CandidateApplication[];
}

export interface AppState {
  role: Role;
  activeTimer: ActiveTimer | null;
  pendingEntry: PendingTimeEntry | null;
  projects: Project[];
  tasks: Task[];
  entries: TimeEntry[];
  invoices: Invoice[];
  leave: LeaveRequest[];
  hiring: HiringState;
}
