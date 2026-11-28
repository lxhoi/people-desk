"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/lib/queries";
import { OUTCOME_LABELS } from "@/lib/seed";
import { formatDurationHours } from "@/lib/utils";

export default function OverviewPage() {
  const { data: state } = useAppState();
  const activeProjects = state.projects.filter((p) => !p.deleted);
  const openTasks = state.tasks.filter((t) => !t.deleted && t.status === "open");
  const publishedJobs = state.hiring.jobs.filter((j) => j.status === "published");
  const totalLoggedSeconds = state.entries.reduce((sum, e) => sum + e.seconds, 0);

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#30205d] to-[#5d39d6] p-7 text-white shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#d8cbff]">
              Welcome back, Hà Linh
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Kobizo People & Delivery Workspace
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#ebe1ff]">
              Manage recruitment pipelines, projects, logged hours, and client invoices—all stored
              locally in your browser with React Query + Zod.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-white text-[#29213d] hover:bg-[#f4f0ff]">
              <Link href="/time">Start logging time</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/hiring">Open Hiring</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/careers">Public Careers</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-[#625878]">Published Jobs</p>
              <p className="mt-1 text-3xl font-bold text-[#29213d]">{publishedJobs.length}</p>
              <Link href="/hiring" className="mt-2 inline-block text-xs font-semibold text-[#613ae5]">
                View Job Description List →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-[#625878]">Active Candidates</p>
              <p className="mt-1 text-3xl font-bold text-[#29213d]">
                {state.hiring.applications.filter((a) => a.outcome === "active").length}
              </p>
              <Link
                href="/hiring/pipeline"
                className="mt-2 inline-block text-xs font-semibold text-[#613ae5]"
              >
                Open Pipeline →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-[#625878]">Open Tasks</p>
              <p className="mt-1 text-3xl font-bold text-[#29213d]">{openTasks.length}</p>
              <Link href="/projects" className="mt-2 inline-block text-xs font-semibold text-[#613ae5]">
                {activeProjects.length} active projects →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-[#625878]">Logged Hours</p>
              <p className="mt-1 text-3xl font-bold text-[#29213d]">
                {formatDurationHours(totalLoggedSeconds)}
              </p>
              <Link href="/reports" className="mt-2 inline-block text-xs font-semibold text-[#613ae5]">
                View Team Reports →
              </Link>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Recent Candidates</CardTitle>
            <Button asChild variant="secondary" size="sm">
              <Link href="/hiring/pipeline">All candidates</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3">
            {state.hiring.applications.slice(0, 5).map((item) => {
              const job = state.hiring.jobs.find((j) => j.id === item.job);
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efeafd] p-3.5"
                >
                  <div>
                    <Link
                      href={`/hiring/jobs/${item.job}`}
                      className="font-semibold text-[#29213d] hover:text-[#613ae5]"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-[#625878]">
                      {job?.title ?? item.job} · Stage: {item.stages[item.stage]?.name}
                    </p>
                  </div>
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
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
