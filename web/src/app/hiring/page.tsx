"use client";

import { MoreVertical } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  AssessmentFormDialog,
  JobFormDialog,
  PreviewAssessmentDialog,
  WorkflowFormDialog,
} from "@/components/hiring/candidate-modals";
import { HiringNav, type HiringTab } from "@/components/hiring/hiring-nav";
import { useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppMutation, useAppState } from "@/lib/queries";
import { EMAIL_TYPE_LABELS, JOB_STATUS_LABELS } from "@/lib/seed";
import type { Assessment, EmailTemplateKey, Job, Workflow } from "@/lib/types";

function HiringContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: HiringTab =
    tabParam === "workflows" || tabParam === "assessments" || tabParam === "templates"
      ? tabParam
      : "jobs";

  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();

  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"published" | "unpublished" | "delete">("published");

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [viewingWorkflow, setViewingWorkflow] = useState<Workflow | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);
  const [confirmDeleteJobs, setConfirmDeleteJobs] = useState<Job[] | null>(null);

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);

  const [editingTemplateKey, setEditingTemplateKey] = useState<EmailTemplateKey | null>(null);
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");

  if (state.role !== "admin") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-bold text-[#29213d]">Access restricted</h1>
          <p className="mt-2 text-sm text-[#625878]">
            Hiring setup and the candidate pipeline require the Admin / HR demo role.
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleJobSelection = (id: string) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkApply = async () => {
    if (!selectedJobs.size) {
      notify("Select at least one job posting.");
      return;
    }
    if (bulkAction === "delete") {
      setConfirmDeleteJobs(state.hiring.jobs.filter((j) => selectedJobs.has(j.id)));
      return;
    }
    await mutation.mutateAsync((draft) => {
      for (const job of draft.hiring.jobs) {
        if (selectedJobs.has(job.id)) job.status = bulkAction;
      }
    });
    notify(`Applied ${bulkAction} to ${selectedJobs.size} posting(s).`);
    setSelectedJobs(new Set());
  };

  const handleToggleJobStatus = async (job: Job) => {
    const nextStatus = job.status === "published" ? "unpublished" : "published";
    await mutation.mutateAsync((draft) => {
      const target = draft.hiring.jobs.find((j) => j.id === job.id);
      if (target) target.status = nextStatus;
    });
    notify(`${job.title} ${nextStatus}.`);
  };

  const handleConfirmDeleteJobs = async () => {
    if (!confirmDeleteJobs?.length) return;
    const ids = new Set(confirmDeleteJobs.map((j) => j.id));
    await mutation.mutateAsync((draft) => {
      draft.hiring.jobs = draft.hiring.jobs.filter((j) => !ids.has(j.id));
      draft.hiring.applications = draft.hiring.applications.filter((a) => !ids.has(a.job));
    });
    notify(`${confirmDeleteJobs.length} job description(s) deleted.`);
    setSelectedJobs(new Set());
    setConfirmDeleteJobs(null);
  };

  const handleConfirmDeleteWorkflow = async () => {
    if (!deletingWorkflow) return;
    const inUse = state.hiring.jobs.some((j) => j.workflow === deletingWorkflow.id);
    if (inUse) return;
    await mutation.mutateAsync((draft) => {
      draft.hiring.workflows = draft.hiring.workflows.filter((w) => w.id !== deletingWorkflow.id);
    });
    notify("Workflow deleted.");
    setDeletingWorkflow(null);
  };

  const handleToggleTest = async (test: Assessment) => {
    await mutation.mutateAsync((draft) => {
      const t = draft.hiring.tests.find((x) => x.id === test.id);
      if (t) t.status = t.status === "published" ? "unpublished" : "published";
    });
    notify("Assessment status updated.");
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateKey || !tplSubject.trim() || !tplBody.trim()) return;
    await mutation.mutateAsync((draft) => {
      draft.hiring.templates[editingTemplateKey] = {
        subject: tplSubject.trim(),
        body: tplBody.trim(),
      };
    });
    notify("Email template saved.");
    setEditingTemplateKey(null);
  };

  const headingByTab: Record<HiringTab, { title: string; subtitle?: string }> = {
    jobs: { title: "Job Description List" },
    workflows: {
      title: "Recruitment Workflow Settings",
      subtitle: "Save reusable stages, then configure and reorder the stages for each job description.",
    },
    assessments: {
      title: "Assessments",
      subtitle: "Prepare tests before assigning one to a candidate.",
    },
    templates: {
      title: "Email Templates",
      subtitle: "Customize automated interview, offer, welcome and rejection messages.",
    },
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#6c5baa]">Hiring</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#29213d]">
            {headingByTab[activeTab].title}
          </h1>
          {headingByTab[activeTab].subtitle ? (
            <p className="mt-1.5 text-sm text-[#625878]">{headingByTab[activeTab].subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "jobs" ? (
            <>
              <Button asChild variant="secondary">
                <Link href="/careers">Public Careers</Link>
              </Button>
              <Button
                onClick={() => {
                  setEditingJob(null);
                  setJobModalOpen(true);
                }}
              >
                Create
              </Button>
            </>
          ) : null}
          {activeTab === "workflows" ? (
            <Button
              onClick={() => {
                setEditingWorkflow(null);
                setWorkflowModalOpen(true);
              }}
            >
              New workflow
            </Button>
          ) : null}
          {activeTab === "assessments" ? (
            <Button
              onClick={() => {
                setEditingAssessment(null);
                setAssessmentModalOpen(true);
              }}
            >
              New assessment
            </Button>
          ) : null}
        </div>
      </header>

      <HiringNav active={activeTab} />

      {activeTab === "jobs" ? (
        <Card>
          <CardHeader className="flex-wrap">
            <div>
              <CardTitle>Job postings</CardTitle>
              <p className="mt-0.5 text-xs text-[#625878]">
                Select postings to change their visibility.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                aria-label="Bulk action"
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)}
                className="w-44"
              >
                <option value="published">Publish selected</option>
                <option value="unpublished">Unpublish selected</option>
                <option value="delete">Delete selected</option>
              </Select>
              <Button variant="secondary" onClick={handleBulkApply}>
                Apply
              </Button>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Job description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.hiring.jobs.map((job) => {
                const wf = state.hiring.workflows.find((w) => w.id === job.workflow);
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${job.title}`}
                        checked={selectedJobs.has(job.id)}
                        onChange={() => toggleJobSelection(job.id)}
                        className="h-4 w-4 accent-[#613ae5]"
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/hiring/jobs/${job.id}`}
                        className="font-bold text-[#29213d] hover:text-[#613ae5] hover:underline"
                      >
                        {job.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#625878]">
                        {job.department} · {job.location}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.status === "published" ? "success" : "muted"}>
                        {JOB_STATUS_LABELS[job.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#4a4160]">
                      {wf?.name ?? "Saved snapshot"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            aria-label={`More actions for ${job.title}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditingJob(job);
                              setJobModalOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleToggleJobStatus(job)}>
                            {job.status === "published" ? "Unpublish" : "Publish"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive
                            onSelect={() => setConfirmDeleteJobs([job])}
                          >
                            Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/hiring/pipeline?job=${job.id}`}>Open pipeline</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {activeTab === "workflows" ? (
        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Stage order</TableHead>
                <TableHead>Assigned jobs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.hiring.workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell className="font-bold">{wf.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {wf.stages.map((s) => (
                        <Badge key={s.id} variant="muted">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {state.hiring.jobs.filter((j) => j.workflow === wf.id).length}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setViewingWorkflow(wf)}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingWorkflow(wf);
                          setWorkflowModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeletingWorkflow(wf)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {activeTab === "assessments" ? (
        <Card>
          <CardHeader>
            <CardTitle>Assessment list</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.hiring.tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell>
                    <p className="font-bold">{test.title}</p>
                    <p className="text-xs text-[#625878]">{test.questions.length} questions</p>
                  </TableCell>
                  <TableCell>{test.minutes} min</TableCell>
                  <TableCell>
                    <Badge variant={test.status === "published" ? "success" : "muted"}>
                      {JOB_STATUS_LABELS[test.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewAssessment(test)}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingAssessment(test);
                          setAssessmentModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleTest(test)}
                      >
                        {test.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {activeTab === "templates" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(EMAIL_TYPE_LABELS) as EmailTemplateKey[]).map((key) => {
            const tpl = state.hiring.templates[key];
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{EMAIL_TYPE_LABELS[key]}</CardTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingTemplateKey(key);
                      setTplSubject(tpl.subject);
                      setTplBody(tpl.body);
                    }}
                  >
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-1.5 text-sm">
                  <p className="font-semibold text-[#29213d]">{tpl.subject}</p>
                  <p className="text-[#625878]">{tpl.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <JobFormDialog job={editingJob} open={jobModalOpen} onOpenChange={setJobModalOpen} />
      <WorkflowFormDialog
        workflow={editingWorkflow}
        open={workflowModalOpen}
        onOpenChange={setWorkflowModalOpen}
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

      <Dialog
        open={Boolean(viewingWorkflow)}
        onOpenChange={(o) => !o && setViewingWorkflow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingWorkflow?.name}</DialogTitle>
            <DialogDescription>Stage order and types</DialogDescription>
          </DialogHeader>
          <ol className="grid gap-2 text-sm">
            {viewingWorkflow?.stages.map((s, idx) => (
              <li key={s.id} className="rounded-xl border border-[#efeafd] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#29213d]">
                    {idx + 1}. {s.name}
                  </span>
                  <Badge variant="muted">{s.kind}</Badge>
                </div>
                <p className="mt-1 text-xs text-[#625878]">{s.criteria}</p>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewingWorkflow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingWorkflow)}
        onOpenChange={(o) => !o && setDeletingWorkflow(null)}
      >
        <DialogContent>
          {deletingWorkflow &&
          state.hiring.jobs.some((j) => j.workflow === deletingWorkflow.id) ? (
            <>
              <DialogHeader>
                <DialogTitle>Deletion blocked</DialogTitle>
                <DialogDescription>
                  Workflow “{deletingWorkflow.name}” is assigned to{" "}
                  {state.hiring.jobs.filter((j) => j.workflow === deletingWorkflow.id).length} job
                  description(s). Reassign or delete those JDs first.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDeletingWorkflow(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirm and delete workflow?</DialogTitle>
                <DialogDescription>
                  “{deletingWorkflow?.name}” will be removed permanently.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDeletingWorkflow(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleConfirmDeleteWorkflow}>
                  Delete workflow
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmDeleteJobs?.length)}
        onOpenChange={(o) => !o && setConfirmDeleteJobs(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm JD deletion?</DialogTitle>
            <DialogDescription>
              {confirmDeleteJobs?.length === 1
                ? `Delete “${confirmDeleteJobs[0].title}” and its applications?`
                : `Delete ${confirmDeleteJobs?.length} selected job descriptions and their applications?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDeleteJobs(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteJobs}>
              Delete selected JDs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingTemplateKey)}
        onOpenChange={(o) => !o && setEditingTemplateKey(null)}
      >
        <DialogContent>
          <form onSubmit={handleSaveTemplate} className="grid gap-3.5">
            <DialogHeader>
              <DialogTitle>
                Edit {editingTemplateKey ? EMAIL_TYPE_LABELS[editingTemplateKey] : ""} template
              </DialogTitle>
              <DialogDescription>
                Use {"{{candidate}}"} and {"{{job}}"} placeholders.
              </DialogDescription>
            </DialogHeader>
            <Field label="Subject">
              <Input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} required />
            </Field>
            <Field label="Message">
              <Textarea
                rows={4}
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                required
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingTemplateKey(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save template</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HiringPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-sm text-[#625878]">Loading hiring...</div>}>
        <HiringContent />
      </Suspense>
    </AppShell>
  );
}
