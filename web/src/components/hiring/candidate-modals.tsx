"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAppMutation, useAppState } from "@/lib/queries";
import {
  assessmentSchema,
  declineCandidateSchema,
  evaluateStageSchema,
  jobSchema,
  scheduleInterviewSchema,
  workflowSchema,
} from "@/lib/schemas";
import {
  buildResumeText,
  EMAIL_TYPE_LABELS,
  getCandidateProfile,
  getJobDetails,
  JOB_STATUS_LABELS,
  OUTCOME_LABELS,
  RATING_LABELS,
  STAGE_KIND_LABELS,
} from "@/lib/seed";
import { parseQuestionsText, parseStagesText, queueCandidateEmail } from "@/lib/store";
import type {
  Assessment,
  CandidateApplication,
  EmailTemplateKey,
  EvaluationRating,
  Job,
  StageKind,
  Workflow,
} from "@/lib/types";
import { initials, uid } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function CandidateProfileDialog({
  candidate,
  job,
  open,
  onOpenChange,
}: {
  candidate: CandidateApplication | null;
  job?: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!candidate) return null;
  const profile = getCandidateProfile(candidate, job);
  const resumeHref = `data:text/plain;charset=utf-8,${encodeURIComponent(
    buildResumeText(candidate, job)
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(920px,calc(100vw-28px))]">
        <DialogHeader>
          <DialogTitle>{candidate.name}</DialogTitle>
          <DialogDescription>Candidate profile · demo resume</DialogDescription>
        </DialogHeader>

        <article className="grid gap-4 text-sm text-[#29213d]">
          <header className="flex items-center gap-4 rounded-xl bg-[#f4f0ff] p-4">
            <div
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-[#e3d7ff] text-base font-bold text-[#4c2cc7] shadow-xs"
            >
              {initials(candidate.name)}
            </div>
            <div>
              <p className="text-base font-bold text-[#4c2cc7]">{profile.headline}</p>
              <p className="text-xs text-[#625878]">
                {candidate.email} · {profile.location}
              </p>
            </div>
          </header>

          <section className="border-t border-[#efeafd] pt-3">
            <h3 className="mb-1 font-bold">Professional summary</h3>
            <p className="text-[#4a4160]">{profile.summary}</p>
          </section>

          <section className="border-t border-[#efeafd] pt-3">
            <h3 className="mb-2 font-bold">Core skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="muted">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>

          <section className="border-t border-[#efeafd] pt-3">
            <h3 className="mb-2 font-bold">Experience</h3>
            <div className="grid gap-3">
              {profile.experience.map((rec) => (
                <div key={rec.title}>
                  <h4 className="font-semibold">{rec.title}</h4>
                  <p className="text-xs text-[#625878]">
                    {rec.company} · {rec.dates}
                  </p>
                  <p className="mt-1 text-[#4a4160]">{rec.details}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-[#efeafd] pt-3">
            <h3 className="mb-1 font-bold">Education</h3>
            <p className="font-medium">{profile.degree}</p>
            <p className="text-xs text-[#625878]">{profile.education}</p>
          </section>

          <section className="border-t border-[#efeafd] pt-3">
            <h3 className="mb-1 font-bold">Portfolio</h3>
            <p className="text-[#4c2cc7]">{profile.portfolio}</p>
          </section>

          <section className="border-t border-[#efeafd] pt-3">
            <h3 className="mb-1 font-bold">Application</h3>
            <p className="text-[#4a4160]">{candidate.answer}</p>
            <p className="mt-1.5 text-xs font-medium text-[#625878]">
              Applied for {job?.title} · Current stage: {candidate.stages[candidate.stage]?.name} ·{" "}
              {OUTCOME_LABELS[candidate.outcome]}
            </p>
          </section>
        </article>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button asChild variant="secondary">
            <a download={`${candidate.id}-resume.txt`} href={resumeHref}>
              Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeclineCandidateDialog({
  candidate,
  job,
  open,
  onOpenChange,
}: {
  candidate: CandidateApplication | null;
  job?: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useAppMutation();
  const { notify } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof declineCandidateSchema>>({
    resolver: zodResolver(declineCandidateSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (open) reset({ reason: "" });
  }, [open, reset]);

  if (!candidate) return null;

  const onSubmit = async (values: z.infer<typeof declineCandidateSchema>) => {
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === candidate.id);
      if (!target) return;
      target.outcome = "rejected";
      target.events.unshift({
        date: new Date().toISOString(),
        message: `Rejected. ${values.reason}`,
      });
      queueCandidateEmail(draft, target, "reject");
    });
    notify(`${candidate.name} declined and rejection email queued.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Confirm decline for this candidate</DialogTitle>
            <DialogDescription>
              {candidate.name} · {job?.title}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-[#625878]">
            System will mark this candidate as declined and send the rejection email to their demo
            inbox.
          </p>
          <Field label="Reason / decision notes" error={errors.reason?.message}>
            <Textarea
              rows={3}
              placeholder="Enter the reason for declining this candidate..."
              {...register("reason")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Confirm decline
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AcceptNextStageDialog({
  candidate,
  job,
  mode = "next",
  open,
  onOpenChange,
  onPrepareAssessment,
  onPreviewAssessment,
}: {
  candidate: CandidateApplication | null;
  job?: Job;
  mode?: "next" | "current";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrepareAssessment: (assessment?: Assessment) => void;
  onPreviewAssessment: (assessment: Assessment) => void;
}) {
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();
  const router = useRouter();

  const liveCandidate = candidate
    ? state.hiring.applications.find((a) => a.id === candidate.id) ?? candidate
    : null;

  const [activeMode, setActiveMode] = useState<"next" | "current">(mode);
  const [confirmHireStep, setConfirmHireStep] = useState(false);

  const targetStageIndex = liveCandidate
    ? activeMode === "current"
      ? liveCandidate.stage
      : Math.min(liveCandidate.stage + 1, liveCandidate.stages.length - 1)
    : 0;
  const isFinal = liveCandidate
    ? activeMode === "next" && liveCandidate.stage >= liveCandidate.stages.length - 1
    : false;
  const targetStage = liveCandidate ? liveCandidate.stages[targetStageIndex] : null;
  const [stageKind, setStageKind] = useState<StageKind>(targetStage?.kind ?? "review");
  const [stagePassed, setStagePassed] = useState<"yes" | "no">("yes");
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [hireTemplate, setHireTemplate] = useState<"offer" | "welcome">("offer");
  const [hireNotes, setHireNotes] = useState("");

  const reviewForm = useForm<z.infer<typeof evaluateStageSchema>>({
    resolver: zodResolver(evaluateStageSchema),
    defaultValues: { rating: "meets", notes: "" },
  });

  const interviewForm = useForm<z.infer<typeof scheduleInterviewSchema>>({
    resolver: zodResolver(scheduleInterviewSchema),
    defaultValues: {
      interviewer: "Hiring Manager",
      first: "",
      second: "",
    },
  });

  useEffect(() => {
    if (!open || !liveCandidate) return;
    setActiveMode(mode);
    setConfirmHireStep(false);
    const idx =
      mode === "current"
        ? liveCandidate.stage
        : Math.min(liveCandidate.stage + 1, liveCandidate.stages.length - 1);
    const target = liveCandidate.stages[idx];
    setStageKind(target?.kind ?? "review");
    setStagePassed("yes");
    const published = state.hiring.tests.filter((t) => t.status === "published");
    setSelectedTestId(published[0]?.id ?? "");
    const tomorrow = new Date(Date.now() + 86400000);
    const dayAfter = new Date(Date.now() + 2 * 86400000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")}`;
    reviewForm.reset({ rating: "meets", notes: "" });
    interviewForm.reset({
      interviewer: "Hiring Manager",
      first: fmt(tomorrow),
      second: fmt(dayAfter),
    });
    setHireNotes("");
  }, [open, mode, liveCandidate?.id, liveCandidate?.stage]);

  if (!liveCandidate) return null;

  const workflow = state.hiring.workflows.find((w) => w.id === job?.workflow);
  const publishedTests = state.hiring.tests.filter((t) => t.status === "published");

  const handleToggleTestStatus = async (test: Assessment) => {
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.tests.find((t) => t.id === test.id);
      if (!target) return;
      target.status = target.status === "published" ? "unpublished" : "published";
      if (target.status === "published") setSelectedTestId(target.id);
    });
    notify(`Assessment ${test.status === "published" ? "unpublished" : "published"}.`);
  };

  const handleConfirmHire = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === liveCandidate.id);
      if (!target) return;
      target.outcome = "hired";
      target.events.unshift({
        date: new Date().toISOString(),
        message: hireNotes.trim() ? `Hired. ${hireNotes.trim()}` : "Hired from candidate review.",
      });
      queueCandidateEmail(draft, target, hireTemplate);
    });
    notify(`${liveCandidate.name} hired and ${hireTemplate} email queued.`);
    onOpenChange(false);
  };

  const handlePassReview = async (values: z.infer<typeof evaluateStageSchema>) => {
    if (stagePassed === "no") {
      await mutation.mutateAsync((draft) => {
        const target = draft.hiring.applications.find((a) => a.id === liveCandidate.id);
        if (!target) return;
        target.outcome = "rejected";
        target.reviews[targetStageIndex] = {
          rating: values.rating as EvaluationRating,
          notes: values.notes,
        };
        target.events.unshift({
          date: new Date().toISOString(),
          message: `Rejected at ${target.stages[targetStageIndex]?.name}. ${values.notes}`,
        });
        queueCandidateEmail(draft, target, "reject");
      });
      notify(`${liveCandidate.name} rejected and rejection email queued.`);
      onOpenChange(false);
      return;
    }

    const wasLastStage = targetStageIndex >= liveCandidate.stages.length - 1;
    let newStageIdx = targetStageIndex;

    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === liveCandidate.id);
      if (!target) return;
      target.reviews[targetStageIndex] = {
        rating: values.rating as EvaluationRating,
        notes: values.notes,
      };
      if (targetStageIndex < target.stages.length - 1) {
        const prevName = target.stages[targetStageIndex].name;
        newStageIdx = targetStageIndex + 1;
        target.stage = newStageIdx;
        target.outcome = "active";
        target.events.unshift({
          date: new Date().toISOString(),
          message: `${prevName} → ${target.stages[newStageIdx].name} (Evaluated: ${
            RATING_LABELS[values.rating]
          }).`,
        });
      } else {
        target.events.unshift({
          date: new Date().toISOString(),
          message: `${target.stages[targetStageIndex].name} evaluated: ${
            RATING_LABELS[values.rating]
          }.`,
        });
      }
    });

    if (wasLastStage) {
      setConfirmHireStep(true);
      notify("All stages passed · Confirm hire or send offer.");
    } else {
      setActiveMode("current");
      setStageKind(liveCandidate.stages[newStageIdx]?.kind ?? "review");
      reviewForm.reset({ rating: "meets", notes: "" });
      notify("Advanced to next stage · Loaded next stage from JD’s workflow.");
    }
  };

  const handleSendAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = state.hiring.tests.find(
      (t) => t.id === (selectedTestId || publishedTests[0]?.id) && t.status === "published"
    );
    if (!chosen) return;
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === liveCandidate.id);
      if (!target) return;
      const destStage =
        activeMode === "current"
          ? target.stage
          : Math.min(target.stage + 1, target.stages.length - 1);
      const prevName = target.stages[target.stage].name;
      target.stage = destStage;
      target.outcome = "active";
      target.tests[destStage] = {
        ...structuredClone(chosen),
        stage: destStage,
      };
      const now = new Date().toISOString();
      target.events.unshift({
        date: now,
        message:
          activeMode === "current"
            ? `Assessment assigned for ${target.stages[destStage].name}: ${chosen.title}.`
            : `${prevName} → ${target.stages[destStage].name}. Assessment assigned: ${chosen.title}.`,
      });
      target.messages.unshift({
        type: "assessment",
        date: now,
        subject: "Assessment invitation",
        body: `Complete ${chosen.title} from the Assessment section on your Candidate Portal.`,
      });
    });
    notify("Assessment link sent and stage status updated.");
    onOpenChange(false);
    router.push(`/hiring/pipeline?job=${job?.id ?? liveCandidate.job}&candidate=${liveCandidate.id}`);
  };

  const handleScheduleInterview = async (values: z.infer<typeof scheduleInterviewSchema>) => {
    const slots = [...new Set([values.first, values.second].filter(Boolean) as string[])];
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === liveCandidate.id);
      if (!target) return;
      const destStage =
        activeMode === "current"
          ? target.stage
          : Math.min(target.stage + 1, target.stages.length - 1);
      const prevName = target.stages[target.stage].name;
      target.stage = destStage;
      target.outcome = "active";
      target.interviews[destStage] = {
        stage: destStage,
        interviewer: values.interviewer,
        slots,
        selected: "",
        status: "Invited",
      };
      target.events.unshift({
        date: new Date().toISOString(),
        message:
          activeMode === "current"
            ? `Interview scheduled for ${target.stages[destStage].name} with ${values.interviewer}.`
            : `${prevName} → ${target.stages[destStage].name}. Interview scheduled with ${values.interviewer}.`,
      });
      queueCandidateEmail(draft, target, "invite");
    });
    notify("Interview scheduled and invitation sent to demo inbox.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(680px,calc(100vw-28px))]">
        {isFinal || confirmHireStep ? (
          <form onSubmit={handleConfirmHire} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Confirm hire</DialogTitle>
              <DialogDescription>
                {liveCandidate.name} · {job?.title}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-[#4a4160]">
              All configured stages in <strong>{workflow?.name ?? "JD workflow"}</strong> are
              complete.
            </p>
            <Field label="Email template">
              <Select
                value={hireTemplate}
                onChange={(e) => setHireTemplate(e.target.value as "offer" | "welcome")}
              >
                <option value="offer">{EMAIL_TYPE_LABELS.offer}</option>
                <option value="welcome">{EMAIL_TYPE_LABELS.welcome}</option>
              </Select>
            </Field>
            <Field label="Hiring notes (optional)">
              <Textarea
                rows={2}
                value={hireNotes}
                onChange={(e) => setHireNotes(e.target.value)}
                placeholder="Optional notes for the hiring timeline..."
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Confirm hire</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Load the next stage from this JD’s workflow</DialogTitle>
              <DialogDescription>
                {liveCandidate.name} · {job?.title} · {workflow?.name ?? "JD workflow"}
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm text-[#29213d]">
              {activeMode === "current" ? "Current stage:" : "Next stage:"}{" "}
              <strong>{targetStage?.name}</strong> (
              {STAGE_KIND_LABELS[targetStage?.kind ?? "review"]})
            </p>

            <ol className="grid gap-2 rounded-xl border border-[#efeafd] bg-[#faf8fe] p-3.5 text-sm">
              {liveCandidate.stages.map((row, idx) => {
                const marker =
                  idx === liveCandidate.stage
                    ? " (Current)"
                    : activeMode === "next" && idx === targetStageIndex
                    ? " → Next"
                    : "";
                return (
                  <li key={row.id} className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#29213d]">
                      {idx + 1}. {row.name}
                      {marker}
                    </span>
                    <Badge variant={idx === targetStageIndex ? "default" : "muted"}>
                      {STAGE_KIND_LABELS[row.kind]}
                    </Badge>
                  </li>
                );
              })}
            </ol>

            <Field label="Configured stage type">
              <Select
                value={stageKind}
                onChange={(e) => setStageKind(e.target.value as StageKind)}
              >
                <option value="review">Review</option>
                <option value="test">Assessment</option>
                <option value="interview">Interview</option>
              </Select>
            </Field>

            {stageKind === "review" ? (
              <form
                onSubmit={reviewForm.handleSubmit(handlePassReview)}
                className="grid gap-3 border-t border-[#efeafd] pt-3"
                noValidate
              >
                <p className="text-xs text-[#625878]">
                  <strong>Evaluate against criteria:</strong> {targetStage?.criteria}
                </p>
                <Field label="Rating" error={reviewForm.formState.errors.rating?.message}>
                  <Select {...reviewForm.register("rating")}>
                    <option value="strong">{RATING_LABELS.strong}</option>
                    <option value="meets">{RATING_LABELS.meets}</option>
                    <option value="needs">{RATING_LABELS.needs}</option>
                  </Select>
                </Field>
                <Field label="Evidence / notes" error={reviewForm.formState.errors.notes?.message}>
                  <Textarea
                    rows={3}
                    placeholder="Summarize evaluation evidence..."
                    {...reviewForm.register("notes")}
                  />
                </Field>
                <Field label="Stage passed?">
                  <Select
                    value={stagePassed}
                    onChange={(e) => setStagePassed(e.target.value as "yes" | "no")}
                  >
                    <option value="yes">
                      Yes —{" "}
                      {targetStageIndex >= liveCandidate.stages.length - 1
                        ? "Proceed to Confirm hire"
                        : "Advance to next configured stage"}
                    </option>
                    <option value="no">No — Confirm rejection (Send rejection email)</option>
                  </Select>
                </Field>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant={stagePassed === "no" ? "danger" : "default"}>
                    {stagePassed === "no" ? "Confirm rejection" : "Advance to next stage"}
                  </Button>
                </DialogFooter>
              </form>
            ) : null}

            {stageKind === "test" ? (
              <form
                onSubmit={handleSendAssessment}
                className="grid gap-3 border-t border-[#efeafd] pt-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#29213d]">Assessment List</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onPrepareAssessment(undefined)}
                  >
                    Create
                  </Button>
                </div>

                <ul className="grid gap-2">
                  {state.hiring.tests.map((test) => {
                    const isPublished = test.status === "published";
                    const activeTestId = selectedTestId || publishedTests[0]?.id;
                    const isSelected = isPublished && activeTestId === test.id;
                    return (
                      <li
                        key={test.id}
                        onClick={() => {
                          if (isPublished) setSelectedTestId(test.id);
                        }}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 text-sm transition-colors ${
                          isSelected
                            ? "border-[#613ae5] bg-[#f6f2ff]"
                            : "border-[#efeafd] bg-white"
                        } ${isPublished ? "cursor-pointer hover:border-[#c9b8f8]" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="selectedAssessment"
                            checked={isSelected}
                            disabled={!isPublished}
                            onChange={() => setSelectedTestId(test.id)}
                            aria-label={`Select ${test.title}`}
                            className="h-4 w-4 accent-[#613ae5]"
                          />
                          <span className="font-semibold text-[#29213d]">{test.title}</span>
                          <Badge variant={isPublished ? "success" : "muted"}>
                            {JOB_STATUS_LABELS[test.status]}
                          </Badge>
                        </div>
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onPrepareAssessment(test)}
                          >
                            Prepare
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onPreviewAssessment(test)}
                          >
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleTestStatus(test)}
                          >
                            {isPublished ? "Unpublish" : "Publish"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {!publishedTests.length ? (
                  <p className="text-xs font-medium text-[#9f2338]">
                    Publish an assessment above before sending.
                  </p>
                ) : null}

                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  {publishedTests.length ? (
                    <Button type="submit">Send assessment link & update stage</Button>
                  ) : null}
                </DialogFooter>
              </form>
            ) : null}

            {stageKind === "interview" ? (
              <form
                onSubmit={interviewForm.handleSubmit(handleScheduleInterview)}
                className="grid gap-3 border-t border-[#efeafd] pt-3"
                noValidate
              >
                <Field
                  label="Interviewer"
                  error={interviewForm.formState.errors.interviewer?.message}
                >
                  <Input {...interviewForm.register("interviewer")} />
                </Field>
                <Field label="First time option" error={interviewForm.formState.errors.first?.message}>
                  <Input type="datetime-local" {...interviewForm.register("first")} />
                </Field>
                <Field label="Second time option (optional)">
                  <Input type="datetime-local" {...interviewForm.register("second")} />
                </Field>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Send interview invitation</Button>
                </DialogFooter>
              </form>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PreviewJdDialog({
  job,
  open,
  onOpenChange,
}: {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!job) return null;
  const details = getJobDetails(job);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(760px,calc(100vw-28px))]">
        <DialogHeader>
          <DialogTitle>{job.title} · Full job description</DialogTitle>
          <DialogDescription>
            {job.department} · {job.location} · Full-time
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-sm text-[#29213d]">
          <p>
            <strong>Compensation:</strong> {details.salary}
          </p>
          <div>
            <h3 className="mb-1 font-bold">About the role</h3>
            <p className="text-[#4a4160]">{job.description}</p>
          </div>
          <div>
            <h3 className="mb-1 font-bold">What you’ll do</h3>
            <ul className="list-disc space-y-1 pl-5 text-[#4a4160]">
              {details.duties.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 font-bold">What you bring</h3>
            <ul className="list-disc space-y-1 pl-5 text-[#4a4160]">
              {details.requirements.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 font-bold">Hiring process</h3>
            <ol className="list-decimal space-y-1 pl-5 text-[#4a4160]">
              {job.stages.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ol>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JobFormDialog({
  job,
  open,
  onOpenChange,
}: {
  job?: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();
  const [stageError, setStageError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
  });

  useEffect(() => {
    if (!open) return;
    setStageError("");
    const wf =
      state.hiring.workflows.find((w) => w.id === job?.workflow) ?? state.hiring.workflows[0];
    const stages = job?.stages ?? wf?.stages ?? [];
    reset({
      title: job?.title ?? "",
      department: job?.department ?? "Design",
      location: job?.location ?? "Ho Chi Minh City · Hybrid",
      description: job?.description ?? "",
      workflow: wf?.id ?? "",
      stagesText: stages.map((s) => `${s.name} | ${s.kind} | ${s.criteria}`).join("\n"),
    });
  }, [open, job, state.hiring.workflows, reset]);

  const onSubmit = async (values: z.infer<typeof jobSchema>) => {
    const stages = parseStagesText(values.stagesText);
    if (!stages) {
      setStageError("Each line must be: Name | review, test, or interview | criteria");
      return;
    }
    await mutation.mutateAsync((draft) => {
      if (job) {
        const idx = draft.hiring.jobs.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
          draft.hiring.jobs[idx] = {
            ...draft.hiring.jobs[idx],
            title: values.title,
            department: values.department,
            location: values.location,
            description: values.description,
            workflow: values.workflow,
            stages,
          };
        }
      } else {
        draft.hiring.jobs.unshift({
          id: uid().slice(0, 8),
          title: values.title,
          department: values.department,
          location: values.location,
          description: values.description,
          workflow: values.workflow,
          stages,
          status: "draft",
        });
      }
    });
    notify(job ? "Job description updated." : "Job description created.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3.5" noValidate>
          <DialogHeader>
            <DialogTitle>{job ? "Edit job description" : "Create job description"}</DialogTitle>
            <DialogDescription>
              Choose a saved recruitment workflow, then configure the stages for this job.
            </DialogDescription>
          </DialogHeader>
          <Field label="Job title" error={errors.title?.message}>
            <Input {...register("title")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Department" error={errors.department?.message}>
              <Input {...register("department")} />
            </Field>
            <Field label="Location" error={errors.location?.message}>
              <Input {...register("location")} />
            </Field>
          </div>
          <Field label="Description" error={errors.description?.message}>
            <Textarea rows={3} {...register("description")} />
          </Field>
          <Field label="Recruitment workflow" error={errors.workflow?.message}>
            <Select
              {...register("workflow")}
              onChange={(e) => {
                register("workflow").onChange(e);
                const wf = state.hiring.workflows.find((w) => w.id === e.target.value);
                if (wf) {
                  setValue(
                    "stagesText",
                    wf.stages.map((s) => `${s.name} | ${s.kind} | ${s.criteria}`).join("\n")
                  );
                }
              }}
            >
              {state.hiring.workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Stages (Name | review, test or interview | criteria)"
            error={errors.stagesText?.message || stageError}
          >
            <Textarea rows={4} {...register("stagesText")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkflowFormDialog({
  workflow,
  open,
  onOpenChange,
}: {
  workflow?: Workflow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useAppMutation();
  const { notify } = useToast();
  const [stageError, setStageError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof workflowSchema>>({
    resolver: zodResolver(workflowSchema),
  });

  useEffect(() => {
    if (!open) return;
    setStageError("");
    reset({
      name: workflow?.name ?? "",
      stagesText: (workflow?.stages ?? []).map((s) => `${s.name} | ${s.kind} | ${s.criteria}`).join("\n"),
    });
  }, [open, workflow, reset]);

  const onSubmit = async (values: z.infer<typeof workflowSchema>) => {
    const stages = parseStagesText(values.stagesText);
    if (!stages) {
      setStageError("Each line must be: Name | review, test, or interview | criteria");
      return;
    }
    await mutation.mutateAsync((draft) => {
      if (workflow) {
        const idx = draft.hiring.workflows.findIndex((w) => w.id === workflow.id);
        if (idx >= 0) draft.hiring.workflows[idx] = { ...workflow, name: values.name, stages };
      } else {
        draft.hiring.workflows.push({ id: uid().slice(0, 8), name: values.name, stages });
      }
    });
    notify("Recruitment workflow saved.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3.5" noValidate>
          <DialogHeader>
            <DialogTitle>{workflow ? "Edit workflow" : "New workflow"}</DialogTitle>
            <DialogDescription>
              Enter stages in order, one per line: Name | review, test or interview | criteria.
            </DialogDescription>
          </DialogHeader>
          <Field label="Workflow name" error={errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label="Stages" error={errors.stagesText?.message || stageError}>
            <Textarea rows={5} {...register("stagesText")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssessmentFormDialog({
  assessment,
  open,
  onOpenChange,
}: {
  assessment?: Assessment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useAppMutation();
  const { notify } = useToast();
  const [qError, setQError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(assessmentSchema),
  });

  useEffect(() => {
    if (!open) return;
    setQError("");
    reset({
      title: assessment?.title ?? "",
      minutes: assessment?.minutes ?? 30,
      questionsText: (assessment?.questions ?? [])
        .map((q) => `${q.prompt} | ${q.answer}`)
        .join("\n"),
    });
  }, [open, assessment, reset]);

  const onSubmit = async (values: { title: string; minutes: number; questionsText: string }) => {
    const questions = parseQuestionsText(values.questionsText);
    if (!questions) {
      setQError("Each line must be: Question | Answer guide");
      return;
    }
    await mutation.mutateAsync((draft) => {
      if (assessment) {
        const idx = draft.hiring.tests.findIndex((t) => t.id === assessment.id);
        if (idx >= 0) {
          draft.hiring.tests[idx] = {
            ...draft.hiring.tests[idx],
            title: values.title,
            minutes: values.minutes,
            questions,
          };
        }
      } else {
        draft.hiring.tests.push({
          id: uid().slice(0, 8),
          title: values.title,
          minutes: values.minutes,
          status: "draft",
          questions,
        });
      }
    });
    notify("Assessment saved.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3.5" noValidate>
          <DialogHeader>
            <DialogTitle>{assessment ? "Prepare assessment" : "New assessment"}</DialogTitle>
            <DialogDescription>
              Enter one question per line as Question | Answer guide.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Title" error={errors.title?.message as string}>
                <Input {...register("title")} />
              </Field>
            </div>
            <Field label="Minutes" error={errors.minutes?.message as string}>
              <Input type="number" {...register("minutes")} />
            </Field>
          </div>
          <Field
            label="Questions"
            error={(errors.questionsText?.message as string) || qError}
          >
            <Textarea rows={4} {...register("questionsText")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PreviewAssessmentDialog({
  assessment,
  open,
  onOpenChange,
}: {
  assessment: Assessment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!assessment) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assessment.title}</DialogTitle>
          <DialogDescription>
            {assessment.minutes} minutes · {JOB_STATUS_LABELS[assessment.status]}
          </DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3 text-sm">
          {assessment.questions.map((q, i) => (
            <li key={i} className="rounded-xl border border-[#efeafd] p-3">
              <p className="font-semibold text-[#29213d]">
                {i + 1}. {q.prompt}
              </p>
              <p className="mt-1 text-xs text-[#625878]">Answer guide: {q.answer}</p>
            </li>
          ))}
        </ol>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
