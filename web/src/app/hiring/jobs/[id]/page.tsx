"use client";

import { MoreVertical } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  AcceptNextStageDialog,
  AssessmentFormDialog,
  CandidateProfileDialog,
  DeclineCandidateDialog,
  JobFormDialog,
  PreviewAssessmentDialog,
  PreviewJdDialog,
} from "@/components/hiring/candidate-modals";
import { useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppMutation, useAppState } from "@/lib/queries";
import { buildJdText, JOB_STATUS_LABELS, OUTCOME_LABELS } from "@/lib/seed";
import type { Assessment, CandidateApplication } from "@/lib/types";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();

  const job = state.hiring.jobs.find((j) => j.id === id);

  const [previewJdOpen, setPreviewJdOpen] = useState(false);
  const [editJobOpen, setEditJobOpen] = useState(false);

  const [profileCandidate, setProfileCandidate] = useState<CandidateApplication | null>(null);
  const [acceptCandidate, setAcceptCandidate] = useState<CandidateApplication | null>(null);
  const [declineCandidate, setDeclineCandidate] = useState<CandidateApplication | null>(null);

  const [assessmentFormOpen, setAssessmentFormOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);

  if (state.role !== "admin") {
    return (
      <AppShell>
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold">Access restricted</h1>
            <p className="mt-2 text-sm text-[#625878]">
              Hiring setup requires the Admin / HR demo role.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold">Job description not found</h1>
            <Button asChild className="mt-4" variant="secondary">
              <Link href="/hiring">← Back to job list</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const candidates = state.hiring.applications
    .filter((a) => a.job === job.id)
    .sort((a, b) => b.stage - a.stage);

  const jdHref = `data:text/plain;charset=utf-8,${encodeURIComponent(buildJdText(job))}`;

  const handleToggleStatus = async () => {
    const next = job.status === "published" ? "unpublished" : "published";
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.jobs.find((j) => j.id === job.id);
      if (target) target.status = next;
    });
    notify(`${job.title} ${next}.`);
  };

  const handleDeleteJob = async () => {
    await mutation.mutateAsync((draft) => {
      draft.hiring.jobs = draft.hiring.jobs.filter((j) => j.id !== job.id);
      draft.hiring.applications = draft.hiring.applications.filter((a) => a.job !== job.id);
    });
    notify(`${job.title} deleted.`);
    router.push("/hiring");
  };

  return (
    <AppShell>
      <div className="grid gap-5">
        <div>
          <Link href="/hiring" className="text-sm font-semibold text-[#613ae5] hover:underline">
            ← Back to job list
          </Link>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6c5baa]">Hiring</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#29213d]">{job.title}</h1>
            <p className="mt-1.5 text-sm text-[#625878]">
              {job.department} · {job.location} · {JOB_STATUS_LABELS[job.status]}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" aria-label={`More actions for ${job.title}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setEditJobOpen(true)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggleStatus}>
                {job.status === "published" ? "Unpublish" : "Publish"}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={handleDeleteJob}>
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/hiring/pipeline?job=${job.id}`}>Open pipeline</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Job description</CardTitle>
            <div className="flex shrink-0 items-center gap-2">
              <Button onClick={() => setPreviewJdOpen(true)}>Preview full JD</Button>
              <Button asChild variant="secondary">
                <a download={`${job.id}-job-description.txt`} href={jdHref}>
                  Download
                </a>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top-fits</CardTitle>
              <p className="mt-0.5 text-xs text-[#625878]">
                Review submitted applications against this job’s configured stages. Candidate order
                is not an automated ranking.
              </p>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Current stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.length ? (
                candidates.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setProfileCandidate(item)}
                        className="cursor-pointer font-bold text-[#5833d8] hover:underline"
                      >
                        {item.name}
                      </button>
                      <p className="text-xs text-[#625878]">{item.email}</p>
                    </TableCell>
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
                    <TableCell>
                      {item.outcome === "active" ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setAcceptCandidate(item)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDeclineCandidate(item)}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-[#8b81a3]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[#625878]">
                    No candidates for this role yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <PreviewJdDialog job={job} open={previewJdOpen} onOpenChange={setPreviewJdOpen} />
      <JobFormDialog job={job} open={editJobOpen} onOpenChange={setEditJobOpen} />

      <CandidateProfileDialog
        candidate={profileCandidate}
        job={job}
        open={Boolean(profileCandidate)}
        onOpenChange={(o) => !o && setProfileCandidate(null)}
      />

      <AcceptNextStageDialog
        candidate={acceptCandidate}
        job={job}
        open={Boolean(acceptCandidate)}
        onOpenChange={(o) => !o && setAcceptCandidate(null)}
        onPrepareAssessment={(test) => {
          setEditingAssessment(test ?? null);
          setAssessmentFormOpen(true);
        }}
        onPreviewAssessment={(test) => setPreviewAssessment(test)}
      />

      <DeclineCandidateDialog
        candidate={declineCandidate}
        job={job}
        open={Boolean(declineCandidate)}
        onOpenChange={(o) => !o && setDeclineCandidate(null)}
      />

      <AssessmentFormDialog
        assessment={editingAssessment}
        open={assessmentFormOpen}
        onOpenChange={setAssessmentFormOpen}
      />

      <PreviewAssessmentDialog
        assessment={previewAssessment}
        open={Boolean(previewAssessment)}
        onOpenChange={(o) => !o && setPreviewAssessment(null)}
      />
    </AppShell>
  );
}
