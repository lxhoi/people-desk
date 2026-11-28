"use client";

import Link from "next/link";
import { ApplyDialog } from "@/components/careers/apply-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppState } from "@/lib/queries";
import { getJobDetails } from "@/lib/seed";
import type { Job } from "@/lib/types";

export function CareerDetailClient({
  jobId,
  initialJob,
}: {
  jobId: string;
  initialJob: Job | null;
}) {
  const { data: state } = useAppState();
  const job = state?.hiring.jobs.find((j) => j.id === jobId) ?? initialJob;

  if (!job || job.status !== "published") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-bold text-[#29213d]">Role unavailable</h1>
          <p className="mt-2 text-sm text-[#625878]">
            This job description is not currently published.
          </p>
          <Link
            href="/careers"
            className="mt-4 inline-block text-sm font-semibold text-[#613ae5] hover:underline"
          >
            ← Back to all open roles
          </Link>
        </CardContent>
      </Card>
    );
  }

  const details = getJobDetails(job);

  return (
    <Card>
      <CardContent className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#efeafd] pb-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge>{job.department}</Badge>
              <span className="text-sm text-[#625878]">{job.location} · Full-time</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#29213d]">{job.title}</h1>
            <p className="mt-2 text-sm font-semibold text-[#4c2cc7]">
              Compensation: {details.salary}
            </p>
          </div>
          <ApplyDialog job={job} />
        </div>

        <div className="mt-6 grid gap-6 text-sm leading-relaxed text-[#29213d]">
          <section>
            <h2 className="mb-2 text-base font-bold">About the role</h2>
            <p className="text-[#4a4160]">{job.description}</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold">What you’ll do</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[#4a4160]">
              {details.duties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold">What you bring</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[#4a4160]">
              {details.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold">Nice to have</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[#4a4160]">
              {details.nice.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold">Hiring process</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-[#4a4160]">
              {job.stages.map((stage) => (
                <li key={stage.id}>
                  <span className="font-semibold text-[#29213d]">{stage.name}</span> —{" "}
                  {stage.criteria}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
