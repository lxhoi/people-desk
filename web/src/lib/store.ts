import { createInitialState } from "./seed";
import type {
  AppState,
  AssessmentQuestion,
  CandidateApplication,
  EmailTemplateKey,
  StageKind,
  WorkflowStage,
} from "./types";

export const STORAGE_KEY = "peopledesk-next-v1";

export function loadLocalState(): AppState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.hiring && Array.isArray(parsed.projects)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seed
  }
  const initial = createInitialState();
  saveLocalState(initial);
  return initial;
}

export function saveLocalState(next: AppState): AppState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors in demo mode
    }
  }
  return next;
}

export function resetLocalState(): AppState {
  const initial = createInitialState();
  return saveLocalState(initial);
}

export function parseStagesText(text: string): WorkflowStage[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const parsed: WorkflowStage[] = [];
  for (let i = 0; i < lines.length; i++) {
    const [name = "", kind = "", criteria = ""] = lines[i].split("|").map((p) => p.trim());
    if (!name || !criteria || !["review", "test", "interview"].includes(kind)) {
      return null;
    }
    parsed.push({ id: `stage-${i}`, name, kind: kind as StageKind, criteria });
  }
  return parsed;
}

export function parseQuestionsText(text: string): AssessmentQuestion[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const parsed: AssessmentQuestion[] = [];
  for (const line of lines) {
    const [prompt = "", answer = ""] = line.split("|").map((p) => p.trim());
    if (!prompt || !answer) return null;
    parsed.push({ prompt, answer });
  }
  return parsed;
}

export function queueCandidateEmail(
  state: AppState,
  candidate: CandidateApplication,
  type: EmailTemplateKey
) {
  const template = state.hiring.templates[type];
  const job = state.hiring.jobs.find((j) => j.id === candidate.job);
  const fill = (v: string) =>
    v.replaceAll("{{candidate}}", candidate.name).replaceAll("{{job}}", job?.title ?? "Role");
  const now = new Date().toISOString();
  candidate.messages.unshift({
    type,
    date: now,
    subject: fill(template.subject),
    body: fill(template.body),
  });
  candidate.events.unshift({
    date: now,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} email queued in demo inbox.`,
  });
}
