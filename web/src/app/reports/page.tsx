"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useState } from "react";
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
import { Input, Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/lib/queries";
import { PEOPLE } from "@/lib/seed";
import { formatDurationHours } from "@/lib/utils";

function ReportsContent() {
  const searchParams = useSearchParams();
  const { data: state } = useAppState();
  const { notify } = useToast();

  const defaultScope =
    searchParams.get("scope") === "personal" || state.role === "employee" ? "personal" : "team";

  const [scope, setScope] = useState<"personal" | "team">(defaultScope);
  const [projectFilter, setProjectFilter] = useState<string>(searchParams.get("project") || "all");
  const [fromDate, setFromDate] = useState<string>(searchParams.get("from") || "2026-11-01");
  const [toDate, setToDate] = useState<string>(searchParams.get("to") || "2026-12-31");
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (state.role === "employee") setScope("personal");
  }, [state.role]);

  const filteredEntries = useMemo(() => {
    return state.entries.filter((e) => {
      if (scope === "personal" && e.person !== "linh") return false;
      if (projectFilter !== "all" && e.project !== projectFilter) return false;
      if (fromDate && e.day < fromDate) return false;
      if (toDate && e.day > toDate) return false;
      return true;
    });
  }, [state.entries, scope, projectFilter, fromDate, toDate]);

  const totalSeconds = filteredEntries.reduce((sum, e) => sum + e.seconds, 0);

  const projectBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredEntries) {
      map.set(e.project, (map.get(e.project) ?? 0) + e.seconds);
    }
    return [...map.entries()]
      .map(([projectId, seconds]) => ({
        projectId,
        name: state.projects.find((p) => p.id === projectId)?.name ?? projectId,
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [filteredEntries, state.projects]);

  const maxProjectSeconds = Math.max(1, ...projectBreakdown.map((p) => p.seconds));

  const csvData = useMemo(() => {
    const header = ["Date", "Person", "Project", "Task", "Time", "Duration(h)", "Source"];
    const rows = filteredEntries.map((e) => {
      const proj = state.projects.find((p) => p.id === e.project)?.name ?? e.project;
      const task = state.tasks.find((t) => t.id === e.task)?.name ?? e.task;
      return [
        e.day,
        PEOPLE[e.person] ?? e.person,
        proj,
        task,
        `${e.startTime}-${e.endTime}`,
        (e.seconds / 3600).toFixed(2),
        e.source,
      ]
        .map((c) => `"${String(c).replaceAll('"', '""')}"`)
        .join(",");
    });
    return `data:text/csv;charset=utf-8,${encodeURIComponent([header.join(","), ...rows].join("\n"))}`;
  }, [filteredEntries, state.projects, state.tasks]);

  const copyFilteredLink = async () => {
    const url = `${window.location.origin}/reports?scope=${scope}&project=${encodeURIComponent(
      projectFilter
    )}&from=${fromDate}&to=${toDate}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Filtered report link copied.");
    } catch {
      notify("Report URL ready: " + url);
    }
  };

  const detailEntries = detailProjectId
    ? filteredEntries.filter((e) => e.project === detailProjectId)
    : [];

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#6c5baa]">Insights</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#29213d]">
            {scope === "personal" ? "Personal report" : "Team report"}
          </h1>
          <p className="mt-1 text-sm text-[#625878]">
            Total logged hours: <strong>{formatDurationHours(totalSeconds)}</strong> (
            {filteredEntries.length} entries)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <a download={`report-${scope}-${fromDate}-to-${toDate}.csv`} href={csvData}>
              Export CSV
            </a>
          </Button>
          <Button variant="secondary" onClick={copyFilteredLink}>
            Copy filtered link
          </Button>
          {state.role !== "employee" ? (
            <Button asChild>
              <Link
                href={`/invoices?project=${encodeURIComponent(
                  projectFilter === "all" ? projectBreakdown[0]?.projectId ?? "atlas" : projectFilter
                )}&from=${fromDate}&to=${toDate}`}
              >
                Open Invoice from Report
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <Card>
        <CardHeader className="flex-wrap">
          <CardTitle>Filters</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {state.role !== "employee" ? (
              <Select
                aria-label="Report scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as "personal" | "team")}
                className="w-40"
              >
                <option value="team">Team report</option>
                <option value="personal">Personal report</option>
              </Select>
            ) : null}
            <Select
              aria-label="Project filter"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-48"
            >
              <option value="all">All projects</option>
              {state.projects
                .filter((p) => !p.deleted)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
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
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours by project</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {projectBreakdown.length ? (
            projectBreakdown.map((item) => (
              <div key={item.projectId} className="grid gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#29213d]">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-[#4c2cc7]">
                      {formatDurationHours(item.seconds)}
                    </span>
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => setDetailProjectId(item.projectId)}
                    >
                      View details
                    </Button>
                  </div>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#efeaff]">
                  <div
                    className="h-full rounded-full bg-[#613ae5]"
                    style={{ width: `${(item.seconds / maxProjectSeconds) * 100}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#625878]">No logged hours match the selected filters.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time entries</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => {
              const proj = state.projects.find((p) => p.id === entry.project);
              const t = state.tasks.find((x) => x.id === entry.task);
              return (
                <TableRow key={entry.id}>
                  <TableCell>{entry.day}</TableCell>
                  <TableCell className="font-semibold">
                    {PEOPLE[entry.person] ?? entry.person}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{t?.name ?? entry.task}</p>
                    <p className="text-xs text-[#625878]">{proj?.name ?? entry.project}</p>
                  </TableCell>
                  <TableCell>
                    {entry.startTime}–{entry.endTime}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.source === "Manual" ? "warning" : "default"}>
                      {entry.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDurationHours(entry.seconds)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={Boolean(detailProjectId)}
        onOpenChange={(o) => !o && setDetailProjectId(null)}
      >
        <DialogContent className="w-[min(720px,calc(100vw-28px))]">
          <DialogHeader>
            <DialogTitle>
              Chart details ·{" "}
              {state.projects.find((p) => p.id === detailProjectId)?.name ?? detailProjectId}
            </DialogTitle>
            <DialogDescription>
              {fromDate} to {toDate} · {detailEntries.length} entry(s)
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.day}</TableCell>
                  <TableCell>{PEOPLE[e.person] ?? e.person}</TableCell>
                  <TableCell>{state.tasks.find((t) => t.id === e.task)?.name ?? e.task}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDurationHours(e.seconds)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailProjectId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-sm text-[#625878]">Loading reports...</div>}>
        <ReportsContent />
      </Suspense>
    </AppShell>
  );
}
