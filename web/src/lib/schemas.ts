import { z } from "zod";

export const jobSchema = z.object({
  title: z.string().trim().min(2, "Enter a job title"),
  department: z.string().trim().min(2, "Enter a department"),
  location: z.string().trim().min(2, "Enter a location"),
  description: z.string().trim().min(10, "Enter a job description (at least 10 characters)"),
  workflow: z.string().trim().min(1, "Select a recruitment workflow"),
  stagesText: z.string().trim().min(3, "Enter at least one stage (Name | review/test/interview | criteria)"),
});

export const workflowSchema = z.object({
  name: z.string().trim().min(2, "Enter a workflow name"),
  stagesText: z.string().trim().min(3, "Enter at least one stage"),
});

export const assessmentSchema = z.object({
  title: z.string().trim().min(2, "Enter an assessment title"),
  minutes: z.coerce.number().int().min(1, "Minimum 1 minute").max(180, "Maximum 180 minutes"),
  questionsText: z.string().trim().min(3, "Enter at least one question (Prompt | Answer guide)"),
});

export const applicationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  cv: z.string().trim().min(10, "Enter a brief summary of your experience"),
  answer: z.string().trim().min(10, "Tell us why you are interested in this role"),
});

export const evaluateStageSchema = z.object({
  rating: z.enum(["strong", "meets", "needs"]),
  notes: z.string().trim().min(3, "Enter evidence or evaluation notes"),
});

export const scheduleInterviewSchema = z.object({
  interviewer: z.string().trim().min(2, "Enter interviewer name"),
  first: z.string().trim().min(1, "Select the first interview slot"),
  second: z.string().trim().optional(),
});

export const declineCandidateSchema = z.object({
  reason: z.string().trim().min(3, "Enter the reason for declining this candidate"),
});

export const emailTemplateSchema = z.object({
  subject: z.string().trim().min(2, "Enter an email subject"),
  body: z.string().trim().min(5, "Enter the email body"),
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Enter a project name"),
  department: z.string().trim().min(2, "Enter a department"),
  lead: z.string().trim().min(2, "Enter a project lead"),
  description: z.string().trim().min(5, "Enter a description"),
  health: z.enum(["On track", "At risk", "Needs review"]),
  phase: z.string().trim().min(2, "Enter current phase"),
});

export const taskSchema = z.object({
  project: z.string().trim().min(1, "Select a project"),
  name: z.string().trim().min(2, "Enter a task name"),
  type: z.enum(["task", "bug", "story"]),
  parent: z.string().optional(),
  priority: z.enum(["High", "Medium", "Low"]),
  owner: z.string().trim().min(1, "Select an owner"),
  due: z.string().trim().min(1, "Select a due date"),
  estimate: z.coerce.number().int().min(1, "Minimum 1 hour").max(200),
  label: z.string().trim().min(1, "Enter a label"),
});

export const manualTimeEntrySchema = z
  .object({
    project: z.string().trim().min(1, "Select a project"),
    task: z.string().trim().min(1, "Select a task"),
    day: z.string().trim().min(1, "Select a date"),
    startTime: z.string().trim().regex(/^\d{2}:\d{2}$/, "Enter start time (HH:MM)"),
    endTime: z.string().trim().regex(/^\d{2}:\d{2}$/, "Enter end time (HH:MM)"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const leaveRequestSchema = z
  .object({
    from: z.string().trim().min(1, "Select start date"),
    to: z.string().trim().min(1, "Select end date"),
    type: z.string().trim().min(1, "Select leave type"),
    notes: z.string().trim().min(3, "Enter a reason or note"),
  })
  .refine((data) => data.to >= data.from, {
    message: "End date must be on or after start date",
    path: ["to"],
  });
