"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ellipsis, Pause, Play, Plus, Square } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AppShell } from "@/components/app-shell";
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
import { Field, Input, Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppMutation, useAppState } from "@/lib/queries";
import { manualTimeEntrySchema, taskSchema } from "@/lib/schemas";
import { PEOPLE } from "@/lib/seed";
import type { Task } from "@/lib/types";
import { formatDurationHours, uid } from "@/lib/utils";

const TARGET_SECONDS = 8 * 3600;
const CURRENT_USER = "linh";

function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function clockString(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function secondsBetweenTimes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) * 60);
}

function formatElapsedHMS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function TimeTrackingContent() {
  const searchParams = useSearchParams();
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();

  const today = useMemo(() => localDayKey(), []);
  const assignedProjects = useMemo(
    () =>
      state.projects.filter(
        (p) => !p.deleted && (state.role === "admin" || p.members.includes(CURRENT_USER))
      ),
    [state.projects, state.role]
  );

  const requestedProject = searchParams.get("project");
  const [selectedProject, setSelectedProject] = useState<string>(
    requestedProject && assignedProjects.some((p) => p.id === requestedProject)
      ? requestedProject
      : assignedProjects[0]?.id ?? ""
  );
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [entryFilterProject, setEntryFilterProject] = useState<string>("all");
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const [manualOpen, setManualOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [over8Warning, setOver8Warning] = useState<{
    source: "Timer" | "Manual";
    project: string;
    task: string;
    day: string;
    startTime: string;
    endTime: string;
    seconds: number;
    projectedTotalSeconds: number;
  } | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!selectedProject && assignedProjects.length) {
      setSelectedProject(assignedProjects[0].id);
    }
  }, [assignedProjects, selectedProject]);

  useEffect(() => {
    if (!state.activeTimer || state.activeTimer.pausedAt) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state.activeTimer]);

  const activeTimer = state.activeTimer;
  const pendingEntry = state.pendingEntry;

  const activeElapsedSeconds = activeTimer
    ? Math.max(
        0,
        ((activeTimer.pausedAt ?? nowTick) - activeTimer.start - activeTimer.pausedMs) / 1000
      )
    : 0;

  const projectTasks = useMemo(
    () => state.tasks.filter((t) => !t.deleted && t.project === selectedProject),
    [state.tasks, selectedProject]
  );

  const dayEntries = useMemo(
    () =>
      state.entries.filter(
        (e) =>
          e.person === CURRENT_USER &&
          e.day === selectedDay &&
          (entryFilterProject === "all" || e.project === entryFilterProject)
      ),
    [state.entries, selectedDay, entryFilterProject]
  );

  const dayTotalSeconds = useMemo(
    () =>
      state.entries
        .filter((e) => e.person === CURRENT_USER && e.day === selectedDay)
        .reduce((sum, e) => sum + e.seconds, 0),
    [state.entries, selectedDay]
  );

  const missingSeconds = Math.max(0, TARGET_SECONDS - dayTotalSeconds);
  const over8Hours = dayTotalSeconds > TARGET_SECONDS;

  const manualForm = useForm<z.infer<typeof manualTimeEntrySchema>>({
    resolver: zodResolver(manualTimeEntrySchema),
    defaultValues: {
      project: selectedProject,
      task: projectTasks.find((t) => t.status === "open")?.id ?? projectTasks[0]?.id ?? "",
      day: selectedDay,
      startTime: "09:00",
      endTime: "12:00",
    },
  });

  const reviewForm = useForm<z.infer<typeof manualTimeEntrySchema>>({
    resolver: zodResolver(manualTimeEntrySchema),
  });

  const taskForm = useForm({
    resolver: zodResolver(taskSchema),
  });

  const openManualModal = () => {
    const firstTask =
      projectTasks.find((t) => t.status === "open")?.id ?? projectTasks[0]?.id ?? "";
    manualForm.reset({
      project: selectedProject,
      task: firstTask,
      day: selectedDay,
      startTime: "09:00",
      endTime: "12:00",
    });
    setManualOpen(true);
  };

  const openReviewModal = (entry: NonNullable<typeof pendingEntry>) => {
    reviewForm.reset({
      project: entry.project,
      task: entry.task,
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
    setReviewOpen(true);
  };

  const openTaskModal = (task?: Task) => {
    setEditingTask(task ?? null);
    taskForm.reset({
      project: task?.project ?? selectedProject,
      name: task?.name ?? "",
      type: task?.type ?? "task",
      parent: task?.parent ?? "",
      priority: task?.priority ?? "Medium",
      owner: task?.owner ?? CURRENT_USER,
      due: task?.due ?? today,
      estimate: task?.estimate ?? 4,
      label: task?.label ?? "Delivery",
    });
    setTaskModalOpen(true);
  };

  const handleToggleTimer = async (task: Task) => {
    if (pendingEntry) {
      notify("Review or save your pending time entry first.");
      return;
    }
    if (activeTimer && activeTimer.task !== task.id) {
      notify("A timer is already running. Stop or pause it first.");
      return;
    }
    const now = Date.now();
    await mutation.mutateAsync((draft) => {
      if (!draft.activeTimer) {
        draft.activeTimer = {
          project: task.project,
          task: task.id,
          start: now,
          pausedAt: null,
          pausedMs: 0,
        };
      } else if (draft.activeTimer.pausedAt) {
        draft.activeTimer.pausedMs += now - draft.activeTimer.pausedAt;
        draft.activeTimer.pausedAt = null;
      } else {
        draft.activeTimer.pausedAt = now;
      }
    });
    setNowTick(now);
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    const end = activeTimer.pausedAt ?? Date.now();
    const secs = Math.max(60, Math.round((end - activeTimer.start - activeTimer.pausedMs) / 1000));
    const day = localDayKey(new Date(activeTimer.start));
    const startTime = clockString(activeTimer.start);
    const endTime = clockString(activeTimer.start + secs * 1000);
    const pending = {
      project: activeTimer.project,
      task: activeTimer.task,
      day,
      startTime,
      endTime: endTime > startTime ? endTime : "23:59",
      seconds: secs,
      source: "Timer" as const,
    };
    await mutation.mutateAsync((draft) => {
      draft.activeTimer = null;
      draft.pendingEntry = pending;
    });
    openReviewModal(pending);
  };

  const commitEntry = async (payload: {
    source: "Timer" | "Manual";
    project: string;
    task: string;
    day: string;
    startTime: string;
    endTime: string;
    seconds: number;
  }) => {
    await mutation.mutateAsync((draft) => {
      draft.entries.unshift({
        id: `entry-${uid().slice(0, 8)}`,
        day: payload.day,
        person: CURRENT_USER,
        project: payload.project,
        task: payload.task,
        startTime: payload.startTime,
        endTime: payload.endTime,
        seconds: payload.seconds,
        source: payload.source,
      });
      draft.pendingEntry = null;
    });
    setSelectedDay(payload.day);
    setOver8Warning(null);
    setManualOpen(false);
    setReviewOpen(false);
    notify("Hours saved against task.");
  };

  const validateAndSubmitEntry = async (
    values: z.infer<typeof manualTimeEntrySchema>,
    source: "Timer" | "Manual"
  ) => {
    const secs = secondsBetweenTimes(values.startTime, values.endTime);
    const existingDaySeconds = state.entries
      .filter((e) => e.person === CURRENT_USER && e.day === values.day)
      .reduce((sum, e) => sum + e.seconds, 0);
    const projectedTotal = existingDaySeconds + secs;

    if (projectedTotal > TARGET_SECONDS) {
      setManualOpen(false);
      setReviewOpen(false);
      setOver8Warning({
        source,
        project: values.project,
        task: values.task,
        day: values.day,
        startTime: values.startTime,
        endTime: values.endTime,
        seconds: secs,
        projectedTotalSeconds: projectedTotal,
      });
      return;
    }

    await commitEntry({
      source,
      project: values.project,
      task: values.task,
      day: values.day,
      startTime: values.startTime,
      endTime: values.endTime,
      seconds: secs,
    });
  };

  const handleSaveTask = async (values: z.infer<typeof taskSchema>) => {
    await mutation.mutateAsync((draft) => {
      if (editingTask) {
        const idx = draft.tasks.findIndex((t) => t.id === editingTask.id);
        if (idx >= 0) {
          draft.tasks[idx] = { ...draft.tasks[idx], ...values };
        }
      } else {
        draft.tasks.unshift({
          id: `task-${uid().slice(0, 8)}`,
          status: "open",
          ...values,
        });
      }
    });
    notify(editingTask ? "Task updated." : "Task created.");
    setTaskModalOpen(false);
  };

  const handleToggleTaskDone = async (task: Task) => {
    await mutation.mutateAsync((draft) => {
      const target = draft.tasks.find((t) => t.id === task.id);
      if (target) target.status = target.status === "done" ? "open" : "done";
    });
    notify(task.status === "done" ? "Task reopened." : "Task completed.");
  };

  const handleDeleteTask = async (task: Task) => {
    await mutation.mutateAsync((draft) => {
      const target = draft.tasks.find((t) => t.id === task.id);
      if (target) target.deleted = true;
    });
    notify("Task deleted.");
  };

  const watchedManualProject = manualForm.watch("project");
  const manualProjectTasks = state.tasks.filter(
    (t) => !t.deleted && t.project === (watchedManualProject || selectedProject)
  );

  return (
    <AppShell>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6c5baa]">
              Projects & time
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#29213d]">
              Time tracking
            </h1>
            <p className="mt-1 text-sm text-[#625878]">
              Logging as <strong>{PEOPLE[CURRENT_USER]}</strong> · Start a live timer or log hours
              manually.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeTimer ? (
              <Button variant="danger" onClick={handleStopTimer}>
                <Square className="h-3.5 w-3.5" />
                Stop timer ({formatElapsedHMS(activeElapsedSeconds)})
              </Button>
            ) : null}
            <Button
              variant="secondary"
              disabled={!assignedProjects.length || Boolean(activeTimer || pendingEntry)}
              onClick={openManualModal}
            >
              Log manually
            </Button>
            <Button disabled={!assignedProjects.length} onClick={() => openTaskModal()}>
              <Plus className="h-4 w-4" />
              New task
            </Button>
          </div>
        </header>

        {activeTimer ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efdca9] bg-[#fff8e9] px-4 py-3 text-sm text-[#65491b]"
          >
            <div>
              <strong>
                {activeTimer.pausedAt
                  ? "Timer paused"
                  : localDayKey(new Date(activeTimer.start)) === today
                  ? "Timer still running"
                  : "Timer running from an earlier day"}
              </strong>
              <p className="text-xs">
                Task: {state.tasks.find((t) => t.id === activeTimer.task)?.name} ·{" "}
                {formatElapsedHMS(activeElapsedSeconds)} elapsed
              </p>
            </div>
            <Button size="sm" onClick={handleStopTimer}>
              Stop & review
            </Button>
          </div>
        ) : null}

        {pendingEntry ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efdca9] bg-[#fff8e9] px-4 py-3 text-sm text-[#65491b]"
          >
            <div>
              <strong>Time entry needs review</strong>
              <p className="text-xs">
                Confirm or correct the recorded duration ({formatDurationHours(pendingEntry.seconds)}
                ) before saving.
              </p>
            </div>
            <Button size="sm" onClick={() => openReviewModal(pendingEntry)}>
              Review entry
            </Button>
          </div>
        ) : null}

        {!assignedProjects.length ? (
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-lg font-bold text-[#29213d]">No assigned projects available</h2>
              <p className="mt-1 text-sm text-[#625878]">
                Create or open an authorized project first before logging time.
              </p>
              <Button asChild className="mt-4">
                <Link href="/projects">Go to Projects & tasks</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-[#faf8ff] to-[#f1ebff]">
              <CardHeader className="flex-wrap">
                <div>
                  <CardTitle>
                    {selectedDay === today ? "Work logged today" : `Work logged on ${selectedDay}`}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-[#625878]">
                    8-hour daily target ·{" "}
                    {missingSeconds > 0
                      ? `${formatDurationHours(missingSeconds)} missing`
                      : over8Hours
                      ? "Over 8h target"
                      : "Daily target met"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      missingSeconds > 0 ? "warning" : over8Hours ? "default" : "success"
                    }
                  >
                    {missingSeconds > 0
                      ? "Hours missing"
                      : over8Hours
                      ? "Over 8h"
                      : "Daily target met"}
                  </Badge>
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={`/reports?scope=personal&project=${encodeURIComponent(
                        selectedProject
                      )}&from=${selectedDay}&to=${selectedDay}`}
                    >
                      View Personal Report
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-3xl font-bold text-[#29213d]">
                    {formatDurationHours(dayTotalSeconds)}
                  </span>
                  <Input
                    type="date"
                    aria-label="Filter date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div
                  role="progressbar"
                  aria-label="Daily time target"
                  aria-valuemin={0}
                  aria-valuemax={480}
                  aria-valuenow={Math.min(480, Math.floor(dayTotalSeconds / 60))}
                  className="h-2.5 w-full overflow-hidden rounded-full bg-[#e3d9fb]"
                >
                  <div
                    className="h-full rounded-full bg-[#613ae5] transition-all"
                    style={{ width: `${Math.min(100, (dayTotalSeconds / TARGET_SECONDS) * 100)}%` }}
                  />
                </div>
                {missingSeconds > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="font-medium text-[#7c5610]">
                      Missing {formatDurationHours(missingSeconds)} for {selectedDay}.
                    </span>
                    <Button size="sm" variant="secondary" onClick={openManualModal}>
                      Log more time
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/leave?day=${selectedDay}`}>Request leave if applicable</Link>
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-wrap">
                <div>
                  <CardTitle>Task List</CardTitle>
                  <p className="mt-0.5 text-xs text-[#625878]">
                    Select a project, manage tasks/sub-tasks, and start or pause a timer.
                  </p>
                </div>
                <Select
                  aria-label="Select project"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-56"
                >
                  {assignedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Log time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTasks.map((task) => {
                    const isRunning = activeTimer?.task === task.id;
                    const isPaused = isRunning && Boolean(activeTimer?.pausedAt);
                    const disabledTimer =
                      Boolean(pendingEntry) ||
                      Boolean(activeTimer && !isRunning) ||
                      (!isRunning && task.status !== "open");
                    const parentName = task.parent
                      ? state.tasks.find((p) => p.id === task.parent)?.name
                      : null;

                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <p className="font-semibold text-[#29213d]">
                            {parentName ? `↳ ${task.name}` : task.name}
                          </p>
                          <p className="text-xs text-[#625878]">
                            {task.type} · {task.label}
                            {parentName ? ` · Sub-task of ${parentName}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.status === "done" ? "success" : "default"}>
                            {task.status === "done" ? "Completed" : "Open"}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.priority}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={isRunning ? "default" : "secondary"}
                              disabled={disabledTimer}
                              aria-label={
                                isRunning && !isPaused
                                  ? `Pause timer for ${task.name}`
                                  : isRunning
                                  ? `Resume timer for ${task.name}`
                                  : `Start timer for ${task.name}`
                              }
                              onClick={() => handleToggleTimer(task)}
                            >
                              {isRunning && !isPaused ? (
                                <Pause className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              {isRunning ? (isPaused ? "Resume" : "Pause") : "Start"}
                            </Button>
                            {isRunning && (
                              <span className="font-mono text-sm font-semibold text-[#613ae5] tabular-nums">
                                {formatElapsedHMS(activeElapsedSeconds)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                                aria-label={`Actions for ${task.name}`}
                                className="h-8 w-8 p-0"
                              >
                                <Ellipsis className="h-4 w-4 rotate-90" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleToggleTaskDone(task)}>
                                {task.status === "done" ? "Reopen" : "Complete"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openTaskModal(task)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedProject(task.project);
                                const firstTask = task.id;
                                manualForm.reset({
                                  project: task.project,
                                  task: firstTask,
                                  day: selectedDay,
                                  startTime: "09:00",
                                  endTime: "12:00",
                                });
                                setManualOpen(true);
                              }}>
                                Manual log
                              </DropdownMenuItem>
                              <DropdownMenuItem destructive onClick={() => handleDeleteTask(task)}>
                                Delete
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

            <Card>
              <CardHeader className="flex-wrap">
                <div>
                  <CardTitle>Time entries ({selectedDay})</CardTitle>
                  <p className="mt-0.5 text-xs text-[#625878]">
                    {dayEntries.length} entry(s) ·{" "}
                    {formatDurationHours(dayEntries.reduce((s, e) => s + e.seconds, 0))}
                  </p>
                </div>
                <Select
                  aria-label="Filter logged entries by project"
                  value={entryFilterProject}
                  onChange={(e) => setEntryFilterProject(e.target.value)}
                  className="w-48"
                >
                  <option value="all">All projects</option>
                  {assignedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayEntries.length ? (
                    dayEntries.map((entry) => {
                      const proj = state.projects.find((p) => p.id === entry.project);
                      const t = state.tasks.find((x) => x.id === entry.task);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <p className="font-semibold">{t?.name ?? entry.task}</p>
                            <p className="text-xs text-[#625878]">{proj?.name ?? entry.project}</p>
                          </TableCell>
                          <TableCell>
                            {entry.startTime}–{entry.endTime}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {formatDurationHours(entry.seconds)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.source === "Manual" ? "warning" : "default"}>
                              {entry.source}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-[#625878]">
                        No entries logged on {selectedDay} for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>

      {/* Manual Entry Modal */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <form
            onSubmit={manualForm.handleSubmit((vals) => validateAndSubmitEntry(vals, "Manual"))}
            className="grid gap-3.5"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Log time manually</DialogTitle>
              <DialogDescription>
                Confirm task, date, and start / end time.
              </DialogDescription>
            </DialogHeader>
            <Field label="Project" error={manualForm.formState.errors.project?.message}>
              <Select {...manualForm.register("project")}>
                {assignedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Task" error={manualForm.formState.errors.task?.message}>
              <Select {...manualForm.register("task")}>
                {manualProjectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date" error={manualForm.formState.errors.day?.message}>
              <Input type="date" {...manualForm.register("day")} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start time" error={manualForm.formState.errors.startTime?.message}>
                <Input type="time" {...manualForm.register("startTime")} />
              </Field>
              <Field label="End time" error={manualForm.formState.errors.endTime?.message}>
                <Input type="time" {...manualForm.register("endTime")} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setManualOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit entry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Recorded Timer Entry Modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <form
            onSubmit={reviewForm.handleSubmit((vals) => validateAndSubmitEntry(vals, "Timer"))}
            className="grid gap-3.5"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Review recorded time</DialogTitle>
              <DialogDescription>
                Verify the task, date, and start/end time before saving.
              </DialogDescription>
            </DialogHeader>
            <Field label="Date" error={reviewForm.formState.errors.day?.message}>
              <Input type="date" {...reviewForm.register("day")} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start time" error={reviewForm.formState.errors.startTime?.message}>
                <Input type="time" {...reviewForm.register("startTime")} />
              </Field>
              <Field label="End time" error={reviewForm.formState.errors.endTime?.message}>
                <Input type="time" {...reviewForm.register("endTime")} />
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  await mutation.mutateAsync((draft) => {
                    draft.pendingEntry = null;
                  });
                  setReviewOpen(false);
                  notify("Pending entry discarded.");
                }}
              >
                Discard
              </Button>
              <Button type="submit">Save hours</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Over 8h Warning Modal */}
      <Dialog open={Boolean(over8Warning)} onOpenChange={(o) => !o && setOver8Warning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Over-8h daily total warning</DialogTitle>
            <DialogDescription>
              Saving this entry ({formatDurationHours(over8Warning?.seconds ?? 0)}) brings your total
              on {over8Warning?.day} to{" "}
              <strong>{formatDurationHours(over8Warning?.projectedTotalSeconds ?? 0)}</strong> (over
              8h). Is the duration accurate?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                if (!over8Warning) return;
                const copy = over8Warning;
                setOver8Warning(null);
                manualForm.reset({
                  project: copy.project,
                  task: copy.task,
                  day: copy.day,
                  startTime: copy.startTime,
                  endTime: copy.endTime,
                });
                setManualOpen(true);
              }}
            >
              No — Correct entry
            </Button>
            <Button
              onClick={() => {
                if (over8Warning) commitEntry(over8Warning);
              }}
            >
              Yes — Save hours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task / Sub-task Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent>
          <form onSubmit={taskForm.handleSubmit(handleSaveTask)} className="grid gap-3.5" noValidate>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit task" : "New task / sub-task"}</DialogTitle>
            </DialogHeader>
            <Field label="Task name" error={taskForm.formState.errors.name?.message as string}>
              <Input {...taskForm.register("name")} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type">
                <Select {...taskForm.register("type")}>
                  <option value="task">Task</option>
                  <option value="story">Story</option>
                  <option value="bug">Bug</option>
                </Select>
              </Field>
              <Field label="Parent task (optional for sub-task)">
                <Select {...taskForm.register("parent")}>
                  <option value="">None (top-level task)</option>
                  {projectTasks
                    .filter((t) => t.id !== editingTask?.id && !t.parent)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Priority">
                <Select {...taskForm.register("priority")}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>
              </Field>
              <Field label="Estimate (h)" error={taskForm.formState.errors.estimate?.message as string}>
                <Input type="number" {...taskForm.register("estimate")} />
              </Field>
              <Field label="Label" error={taskForm.formState.errors.label?.message as string}>
                <Input {...taskForm.register("label")} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function TimePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#625878]">Loading time tracking...</div>}>
      <TimeTrackingContent />
    </Suspense>
  );
}
