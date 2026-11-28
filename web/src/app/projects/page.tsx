"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { projectSchema, taskSchema } from "@/lib/schemas";
import { PEOPLE } from "@/lib/seed";
import type { Project, Task } from "@/lib/types";
import { formatDurationHours, uid } from "@/lib/utils";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function ProjectsPage() {
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();

  const activeProjects = useMemo(
    () =>
      state.projects.filter(
        (p) => !p.deleted && (state.role !== "employee" || p.members.includes("linh"))
      ),
    [state.projects, state.role]
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjects[0]?.id ?? ""
  );
  const selectedProject =
    activeProjects.find((p) => p.id === selectedProjectId) ?? activeProjects[0] ?? null;

  const today = useMemo(() => todayKey(), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<Project | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const projectForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
  });

  const taskForm = useForm({
    resolver: zodResolver(taskSchema),
  });

  const canManageProjects = state.role === "admin" || state.role === "manager";

  const openProjectModal = (project?: Project) => {
    setEditingProject(project ?? null);
    projectForm.reset({
      name: project?.name ?? "",
      department: project?.department ?? "Engineering",
      lead: project?.lead ?? "Hà Linh",
      description: project?.description ?? "",
      health: project?.health ?? "On track",
      phase: project?.phase ?? "Build",
    });
    setProjectModalOpen(true);
  };

  const openTaskModal = (task?: Task) => {
    if (!selectedProject) return;
    setEditingTask(task ?? null);
    taskForm.reset({
      project: task?.project ?? selectedProject.id,
      name: task?.name ?? "",
      type: task?.type ?? "task",
      parent: task?.parent ?? "",
      priority: task?.priority ?? "Medium",
      owner: task?.owner ?? "linh",
      due: task?.due ?? today,
      estimate: task?.estimate ?? 4,
      label: task?.label ?? "Delivery",
    });
    setTaskModalOpen(true);
  };

  const handleSaveProject = async (values: z.infer<typeof projectSchema>) => {
    let createdId = "";
    await mutation.mutateAsync((draft) => {
      if (editingProject) {
        const idx = draft.projects.findIndex((p) => p.id === editingProject.id);
        if (idx >= 0) draft.projects[idx] = { ...draft.projects[idx], ...values };
      } else {
        createdId = `proj-${uid().slice(0, 8)}`;
        draft.projects.unshift({
          id: createdId,
          ...values,
          members: ["linh", "an", "ha"],
        });
      }
    });
    if (createdId) setSelectedProjectId(createdId);
    notify(editingProject ? "Project details saved." : "Project created.");
    setProjectModalOpen(false);
  };

  const handleDeleteProject = async () => {
    if (!confirmDeleteProject) return;
    await mutation.mutateAsync((draft) => {
      const target = draft.projects.find((p) => p.id === confirmDeleteProject.id);
      if (target) target.deleted = true;
    });
    notify(`Project “${confirmDeleteProject.name}” deleted.`);
    setConfirmDeleteProject(null);
  };

  const handleSaveTask = async (values: z.infer<typeof taskSchema>) => {
    await mutation.mutateAsync((draft) => {
      if (editingTask) {
        const idx = draft.tasks.findIndex((t) => t.id === editingTask.id);
        if (idx >= 0) draft.tasks[idx] = { ...draft.tasks[idx], ...values };
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

  const toggleTaskDone = async (taskId: string) => {
    await mutation.mutateAsync((draft) => {
      const t = draft.tasks.find((x) => x.id === taskId);
      if (t) t.status = t.status === "done" ? "open" : "done";
    });
    notify("Task status updated.");
  };

  const handleBulkDeleteTasks = async () => {
    if (!selectedTaskIds.size) return;
    await mutation.mutateAsync((draft) => {
      for (const t of draft.tasks) {
        if (selectedTaskIds.has(t.id)) t.deleted = true;
      }
    });
    notify(`${selectedTaskIds.size} task(s) deleted.`);
    setSelectedTaskIds(new Set());
  };

  const projectTasks = selectedProject
    ? state.tasks.filter((t) => !t.deleted && t.project === selectedProject.id)
    : [];

  const projectRangeSeconds = selectedProject
    ? state.entries
        .filter(
          (e) =>
            e.project === selectedProject.id && e.day >= fromDate && e.day <= toDate
        )
        .reduce((sum, e) => sum + e.seconds, 0)
    : 0;

  return (
    <AppShell>
      <div className="grid gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6c5baa]">Workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#29213d]">
              Projects & tasks
            </h1>
            <p className="mt-1 text-sm text-[#625878]">
              Select a project to manage tasks, sub-tasks, and review project hours.
            </p>
          </div>
          {canManageProjects ? (
            <Button onClick={() => openProjectModal()}>New project</Button>
          ) : null}
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeProjects.map((project) => {
            const isSelected = selectedProject?.id === project.id;
            return (
              <Card
                key={project.id}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setSelectedTaskIds(new Set());
                }}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#613ae5] ring-2 ring-[#613ae5]/20"
                    : "hover:border-[#c9b8f8]"
                }`}
              >
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge
                      variant={
                        project.health === "On track"
                          ? "success"
                          : project.health === "At risk"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {project.health}
                    </Badge>
                    <span className="text-xs font-medium text-[#625878]">{project.phase}</span>
                  </div>
                  <h2 className="text-base font-bold text-[#29213d]">{project.name}</h2>
                  <p className="mt-1 text-xs text-[#625878]">{project.description}</p>
                  <p className="mt-3 text-xs font-semibold text-[#4a4160]">
                    Lead: {project.lead} · {project.department}
                  </p>
                  {canManageProjects ? (
                    <div
                      className="mt-3 flex gap-2 border-t border-[#efeafd] pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openProjectModal(project)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirmDeleteProject(project)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedProject ? (
          <>
            <Card>
              <CardHeader className="flex-wrap">
                <div>
                  <CardTitle>Project hours · {selectedProject.name}</CardTitle>
                  <p className="mt-0.5 text-xs text-[#625878]">
                    Total in range: <strong>{formatDurationHours(projectRangeSeconds)}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    aria-label="From date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    aria-label="To date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-40"
                  />
                  <Button asChild variant="secondary">
                    <Link
                      href={`/reports?scope=${
                        state.role === "employee" ? "personal" : "team"
                      }&project=${encodeURIComponent(
                        selectedProject.id
                      )}&from=${fromDate}&to=${toDate}`}
                    >
                      View Report
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex-wrap">
                <div>
                  <CardTitle>Task List · {selectedProject.name}</CardTitle>
                  <p className="mt-0.5 text-xs text-[#625878]">
                    {projectTasks.length} task(s) in this project
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTaskIds.size > 0 ? (
                    <Button size="sm" variant="danger" onClick={handleBulkDeleteTasks}>
                      Delete selected ({selectedTaskIds.size})
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => openTaskModal()}>
                    New task
                  </Button>
                </div>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Select</TableHead>
                    <TableHead>Task / Sub-task</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTasks.map((task) => {
                    const parentName = task.parent
                      ? state.tasks.find((p) => p.id === task.parent)?.name
                      : null;
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select ${task.name}`}
                            checked={selectedTaskIds.has(task.id)}
                            onChange={() => {
                              setSelectedTaskIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(task.id)) next.delete(task.id);
                                else next.add(task.id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 accent-[#613ae5]"
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">
                            {parentName ? `↳ ${task.name}` : task.name}
                          </p>
                          <p className="text-xs text-[#625878]">
                            {task.type} · {task.label}
                          </p>
                        </TableCell>
                        <TableCell>{PEOPLE[task.owner] ?? task.owner}</TableCell>
                        <TableCell>{task.priority}</TableCell>
                        <TableCell>
                          <Badge variant={task.status === "done" ? "success" : "default"}>
                            {task.status === "done" ? "Completed" : "Open"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => toggleTaskDone(task.id)}
                            >
                              {task.status === "done" ? "Reopen" : "Complete"}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openTaskModal(task)}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </>
        ) : null}
      </div>

      {/* Create/Edit Project Dialog */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent>
          <form
            onSubmit={projectForm.handleSubmit(handleSaveProject)}
            className="grid gap-3.5"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Edit project details" : "New project"}
              </DialogTitle>
            </DialogHeader>
            <Field label="Project name" error={projectForm.formState.errors.name?.message}>
              <Input {...projectForm.register("name")} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Department" error={projectForm.formState.errors.department?.message}>
                <Input {...projectForm.register("department")} />
              </Field>
              <Field label="Lead" error={projectForm.formState.errors.lead?.message}>
                <Input {...projectForm.register("lead")} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Health">
                <Select {...projectForm.register("health")}>
                  <option value="On track">On track</option>
                  <option value="At risk">At risk</option>
                  <option value="Needs review">Needs review</option>
                </Select>
              </Field>
              <Field label="Phase" error={projectForm.formState.errors.phase?.message}>
                <Input {...projectForm.register("phase")} />
              </Field>
            </div>
            <Field label="Description" error={projectForm.formState.errors.description?.message}>
              <Textarea rows={3} {...projectForm.register("description")} />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setProjectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save and return to list</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Deletion Warning */}
      <Dialog
        open={Boolean(confirmDeleteProject)}
        onOpenChange={(o) => !o && setConfirmDeleteProject(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm project deletion?</DialogTitle>
            <DialogDescription>
              Warning: Deleting “{confirmDeleteProject?.name}” removes it from active project lists
              and time tracking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDeleteProject(null)}>
              Cancel and return to Project List
            </Button>
            <Button variant="danger" onClick={handleDeleteProject}>
              Delete selected project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
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
              <Field label="Parent task (optional)">
                <Select {...taskForm.register("parent")}>
                  <option value="">None (top-level)</option>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Owner">
                <Select {...taskForm.register("owner")}>
                  {Object.entries(PEOPLE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority">
                <Select {...taskForm.register("priority")}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>
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
