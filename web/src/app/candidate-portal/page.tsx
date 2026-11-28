"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useAppMutation, useAppState } from "@/lib/queries";
import { OUTCOME_LABELS } from "@/lib/seed";
import { formatDateTime } from "@/lib/utils";

function CandidatePortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();

  const candidate = state.hiring.applications.find((a) => a.token === token);
  const job = candidate ? state.hiring.jobs.find((j) => j.id === candidate.job) : null;

  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [changeReason, setChangeReason] = useState("");

  if (!candidate) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold text-[#29213d]">Candidate link not found</h1>
            <p className="mt-2 text-sm text-[#625878]">
              Open a candidate from Hiring Pipeline or apply on Public Careers.
            </p>
            <Button asChild className="mt-4">
              <Link href="/careers">Go to Public Careers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStage = candidate.stages[candidate.stage];
  const test = candidate.tests[candidate.stage];
  const interview = candidate.interviews[candidate.stage];

  const handleStartTest = async () => {
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === candidate.id);
      if (!target?.tests[target.stage]) return;
      target.tests[target.stage].started = Date.now();
    });
    notify("Assessment started.");
  };

  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === candidate.id);
      const t = target?.tests[target.stage];
      if (!target || !t) return;
      t.answers = (t.questions ?? []).map((_, idx) => answers[idx] ?? "");
      t.submitted = new Date().toISOString();
      t.result = "Pending review";
      target.events.unshift({ date: new Date().toISOString(), message: "Assessment submitted." });
    });
    notify("Assessment submitted!");
  };

  const handleConfirmInterview = async () => {
    const slot = selectedSlot || interview?.slots[0] || "";
    if (!slot) return;
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === candidate.id);
      const iv = target?.interviews[target.stage];
      if (!target || !iv) return;
      iv.selected = slot;
      iv.status = "Confirmed";
      target.events.unshift({
        date: new Date().toISOString(),
        message: `Candidate confirmed interview slot: ${formatDateTime(slot)}.`,
      });
    });
    notify("Interview confirmed!");
  };

  const handleRequestChange = async () => {
    if (!changeReason.trim()) return;
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === candidate.id);
      const iv = target?.interviews[target.stage];
      if (!target || !iv) return;
      iv.status = "Change requested";
      iv.notes = changeReason.trim();
      target.events.unshift({
        date: new Date().toISOString(),
        message: `Candidate requested new interview time: ${changeReason.trim()}`,
      });
    });
    setChangeReason("");
    notify("Schedule change request sent to HR.");
  };

  return (
    <div className="min-h-screen bg-[#f6f4fb]">
      <header className="border-b border-[#e7e1f7] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-[#613ae5]">Candidate Portal</p>
            <h1 className="text-lg font-bold text-[#29213d]">
              {candidate.name} · {job?.title}
            </h1>
          </div>
          <Link href="/hiring" className="text-sm font-semibold text-[#613ae5] hover:underline">
            Back to Workspace
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-5 px-6 py-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Application status</CardTitle>
              <p className="text-xs text-[#625878]">Current stage: {currentStage?.name}</p>
            </div>
            <Badge
              variant={
                candidate.outcome === "hired"
                  ? "success"
                  : candidate.outcome === "rejected"
                  ? "danger"
                  : "default"
              }
            >
              {OUTCOME_LABELS[candidate.outcome]}
            </Badge>
          </CardHeader>
        </Card>

        {test && candidate.outcome === "active" ? (
          <Card>
            <CardHeader>
              <CardTitle>Assessment: {test.title}</CardTitle>
              <Badge>{test.submitted ? "Submitted" : `${test.minutes ?? 30} min`}</Badge>
            </CardHeader>
            <CardContent>
              {test.submitted ? (
                <p className="text-sm text-[#4a4160]">
                  Submitted on {formatDateTime(test.submitted)}. Result: {test.result}.
                </p>
              ) : !test.started ? (
                <div className="grid gap-3">
                  <p className="text-sm text-[#625878]">
                    You have one timed attempt. Start when you are ready.
                  </p>
                  <Button onClick={handleStartTest} className="w-fit">
                    Start assessment
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitTest} className="grid gap-4">
                  {(test.questions ?? []).map((q, idx) => (
                    <Field key={idx} label={`${idx + 1}. ${q.prompt}`}>
                      <Textarea
                        rows={3}
                        value={answers[idx] ?? ""}
                        onChange={(e) => {
                          const next = [...answers];
                          next[idx] = e.target.value;
                          setAnswers(next);
                        }}
                      />
                    </Field>
                  ))}
                  <Button type="submit" className="w-fit">
                    Submit assessment
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : null}

        {interview && candidate.outcome === "active" ? (
          <Card>
            <CardHeader>
              <CardTitle>Interview scheduling</CardTitle>
              <Badge>{interview.status}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p className="text-[#625878]">
                Interviewer: <strong>{interview.interviewer ?? "Hiring Manager"}</strong>
              </p>
              {interview.status === "Confirmed" && interview.selected ? (
                <p className="font-semibold text-[#176b41]">
                  Confirmed for {formatDateTime(interview.selected)}
                </p>
              ) : (
                <div className="grid gap-3">
                  <Field label="Choose an available slot">
                    <Select
                      value={selectedSlot || interview.slots[0] || ""}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                    >
                      {interview.slots.map((slot) => (
                        <option key={slot} value={slot}>
                          {formatDateTime(slot)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button onClick={handleConfirmInterview} className="w-fit">
                    Confirm interview time
                  </Button>
                  <div className="border-t border-[#efeafd] pt-3">
                    <Field label="Need a different time?">
                      <Textarea
                        rows={2}
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder="Share your availability..."
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={handleRequestChange}
                    >
                      Request another time
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Demo Inbox ({candidate.messages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {candidate.messages.length ? (
              <ul className="grid gap-3">
                {candidate.messages.map((m, i) => (
                  <li key={i} className="rounded-xl border border-[#efeafd] bg-[#faf8fe] p-3.5">
                    <p className="font-semibold text-[#29213d]">{m.subject}</p>
                    <p className="mt-1 text-sm text-[#4a4160]">{m.body}</p>
                    <p className="mt-1 text-xs text-[#625878]">{formatDateTime(m.date)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#625878]">No emails received yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function CandidatePortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#625878]">Loading portal...</div>}>
      <CandidatePortalContent />
    </Suspense>
  );
}
