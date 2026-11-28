"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  AcceptNextStageDialog,
  AssessmentFormDialog,
  DeclineCandidateDialog,
  PreviewAssessmentDialog,
} from "@/components/hiring/candidate-modals";
import { useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppMutation, useAppState } from "@/lib/queries";
import { OUTCOME_LABELS, RATING_LABELS } from "@/lib/seed";
import type { Assessment } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function PipelineContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();

  const jobId = searchParams.get("job") || state.hiring.jobs[0]?.id || "";
  const candidateId = searchParams.get("candidate") || "";
  const [stageFilter, setStageFilter] = useState("all");

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);

  if (state.role !== "admin") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-bold">Access restricted</h1>
          <p className="mt-2 text-sm text-[#625878]">
            Candidate pipeline requires the Admin / HR demo role.
          </p>
        </CardContent>
      </Card>
    );
  }

  const job = state.hiring.jobs.find((j) => j.id === jobId) ?? state.hiring.jobs[0];
  const candidates = state.hiring.applications.filter(
    (a) => a.job === job?.id && (stageFilter === "all" || String(a.stage) === stageFilter)
  );
  const selected =
    candidates.find((c) => c.id === candidateId) ?? candidates[0] ?? null;

  const handleGrade = async (result: "Passed" | "Failed") => {
    if (!selected) return;
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === selected.id);
      if (!target || !target.tests[target.stage]) return;
      target.tests[target.stage].result = result;
      target.events.unshift({
        date: new Date().toISOString(),
        message: `Assessment graded: ${result}.`,
      });
    });
    notify(`Assessment graded as ${result}.`);
  };

  const handleInterviewStatus = async (status: "Completed" | "Cancelled") => {
    if (!selected) return;
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.applications.find((a) => a.id === selected.id);
      if (!target || !target.interviews[target.stage]) return;
      target.interviews[target.stage].status = status;
      target.events.unshift({
        date: new Date().toISOString(),
        message: `Interview ${status.toLowerCase()}.`,
      });
    });
    notify(`Interview marked ${status.toLowerCase()}.`);
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#6c5baa]">Hiring</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#29213d]">
            Candidate pipeline
          </h1>
          <p className="mt-1 text-sm text-[#625878]">{job?.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Job filter"
            value={job?.id ?? ""}
            onChange={(e) => router.push(`/hiring/pipeline?job=${e.target.value}`)}
            className="w-52"
          >
            {state.hiring.jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </Select>
          <Button asChild variant="secondary">
            <Link href={job ? `/hiring/jobs/${job.id}` : "/hiring"}>Job Detail</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Applicants</CardTitle>
          <Select
            aria-label="Filter by stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-48"
          >
            <option value="all">All stages</option>
            {job?.stages.map((s, idx) => (
              <option key={s.id} value={String(idx)}>
                {s.name}
              </option>
            ))}
          </Select>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Current stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell>{item.stages[item.stage]?.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.outcome === "hired"
                        ? "success"
                        : item.outcome === "rejected"
                        ? "danger"
                        : "default"
                    }
                  >
                    {OUTCOME_LABELS[item.outcome]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={selected?.id === item.id ? "default" : "secondary"}
                    onClick={() =>
                      router.push(`/hiring/pipeline?job=${job?.id}&candidate=${item.id}`)
                    }
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selected ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{selected.name}</CardTitle>
                <p className="text-xs text-[#625878]">
                  {selected.email} · Stage: {selected.stages[selected.stage]?.name}
                </p>
              </div>
              {selected.outcome === "active" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setAcceptOpen(true)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeclineOpen(true)}>
                    Decline
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="text-[#4a4160]">{selected.cv}</p>
              <p className="text-[#4a4160]">{selected.answer}</p>
              <div className="pt-2">
                <Link
                  href={`/candidate-portal?token=${encodeURIComponent(selected.token)}`}
                  className="text-xs font-semibold text-[#613ae5] underline"
                >
                  Open Candidate Portal as {selected.name} →
                </Link>
              </div>

              {selected.reviews[selected.stage] ? (
                <div className="rounded-xl border border-[#efeafd] bg-[#faf8fe] p-3">
                  <p className="font-semibold">
                    Evaluation: {RATING_LABELS[selected.reviews[selected.stage].rating]}
                  </p>
                  <p className="text-xs text-[#625878]">{selected.reviews[selected.stage].notes}</p>
                </div>
              ) : null}

              {selected.tests[selected.stage] ? (
                <div className="rounded-xl border border-[#efeafd] bg-[#faf8fe] p-3">
                  <p className="font-semibold">
                    Assessment: {selected.tests[selected.stage].title}
                  </p>
                  <p className="text-xs text-[#625878]">
                    Result: {selected.tests[selected.stage].result ?? "Assigned"}
                  </p>
                  {selected.tests[selected.stage].answers?.length ? (
                    <div className="mt-2 grid gap-1 text-xs text-[#4a4160]">
                      {selected.tests[selected.stage].answers?.map((ans, idx) => (
                        <p key={idx}>
                          <strong>A{idx + 1}:</strong> {ans || "(No answer)"}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {selected.tests[selected.stage].submitted ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleGrade("Passed")}>
                        Mark Passed
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleGrade("Failed")}>
                        Mark Failed
                      </Button>
                      <Button size="sm" onClick={() => setAcceptOpen(true)}>
                        Evaluate stage
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selected.interviews[selected.stage] ? (
                <div className="rounded-xl border border-[#efeafd] bg-[#faf8fe] p-3">
                  <p className="font-semibold">
                    Interview ({selected.interviews[selected.stage].status})
                  </p>
                  <p className="text-xs text-[#625878]">
                    Interviewer: {selected.interviews[selected.stage].interviewer ?? "Hiring team"}
                  </p>
                  {selected.interviews[selected.stage].notes ? (
                    <p className="mt-1 text-xs text-[#625878]">
                      Note: {selected.interviews[selected.stage].notes}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleInterviewStatus("Completed")}
                    >
                      Mark Completed
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleInterviewStatus("Cancelled")}
                    >
                      Cancel Interview
                    </Button>
                    <Button size="sm" onClick={() => setAcceptOpen(true)}>
                      Evaluate stage
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline & Demo Inbox</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-[#625878]">Events</h3>
                <ul className="grid gap-2">
                  {selected.events.map((ev, i) => (
                    <li key={i} className="rounded-lg border border-[#efeafd] p-2.5">
                      <p className="font-medium">{ev.message}</p>
                      <p className="text-xs text-[#625878]">{formatDateTime(ev.date)}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-[#625878]">
                  Demo Inbox ({selected.messages.length})
                </h3>
                {selected.messages.length ? (
                  <ul className="grid gap-2">
                    {selected.messages.map((m, i) => (
                      <li key={i} className="rounded-lg border border-[#efeafd] bg-[#faf8fe] p-2.5">
                        <p className="font-semibold">{m.subject}</p>
                        <p className="mt-1 text-xs text-[#625878]">{m.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#625878]">No messages queued yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <AcceptNextStageDialog
        candidate={selected}
        job={job}
        mode="current"
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        onPrepareAssessment={(t) => {
          setEditingAssessment(t ?? null);
          setAssessmentModalOpen(true);
        }}
        onPreviewAssessment={(t) => setPreviewAssessment(t)}
      />
      <DeclineCandidateDialog
        candidate={selected}
        job={job}
        open={declineOpen}
        onOpenChange={setDeclineOpen}
      />
      <AssessmentFormDialog
        assessment={editingAssessment}
        open={assessmentModalOpen}
        onOpenChange={setAssessmentModalOpen}
      />
      <PreviewAssessmentDialog
        assessment={previewAssessment}
        open={Boolean(previewAssessment)}
        onOpenChange={(o) => !o && setPreviewAssessment(null)}
      />
    </div>
  );
}

export default function PipelinePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-sm text-[#625878]">Loading pipeline...</div>}>
        <PipelineContent />
      </Suspense>
    </AppShell>
  );
}
