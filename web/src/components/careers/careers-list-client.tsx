"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppState } from "@/lib/queries";
import type { Job } from "@/lib/types";

export function CareersListClient({ initialJobs }: { initialJobs: Job[] }) {
  const { data: state } = useAppState();
  const jobs = (state?.hiring.jobs ?? initialJobs).filter((j) => j.status === "published");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {jobs.length ? (
        jobs.map((job) => (
          <Card key={job.id} className="transition-shadow hover:shadow-md">
            <CardContent className="flex h-full flex-col justify-between p-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge>{job.department}</Badge>
                  <span className="text-xs font-medium text-[#625878]">{job.location}</span>
                </div>
                <h2 className="text-lg font-bold text-[#29213d]">{job.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-[#625878]">{job.description}</p>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#efeafd] pt-4">
                <span className="text-xs font-medium text-[#625878]">
                  {job.stages.length} hiring stages
                </span>
                <Link
                  href={`/careers/${job.id}`}
                  className="text-sm font-semibold text-[#613ae5] hover:underline"
                >
                  View job & apply →
                </Link>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="sm:col-span-2">
          <CardContent className="p-8 text-center text-sm text-[#625878]">
            No published roles at the moment.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
