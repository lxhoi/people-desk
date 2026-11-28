import type { Metadata } from "next";
import Link from "next/link";
import { CareersListClient } from "@/components/careers/careers-list-client";
import { Badge } from "@/components/ui/badge";
import { SEED_JOBS } from "@/lib/seed";

export const metadata: Metadata = {
  title: "Careers at Kobizo · peopleDesk",
  description:
    "Explore open roles across Design, Engineering, People Operations, and Marketing at Kobizo.",
};

export default function CareersPage() {
  const publishedJobs = SEED_JOBS.filter((job) => job.status === "published");

  return (
    <div className="min-h-screen bg-[#f6f4fb]">
      <header className="border-b border-[#e7e1f7] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#613ae5] font-bold text-white">
              K
            </div>
            <div>
              <p className="text-sm font-bold text-[#29213d]">Kobizo Careers</p>
              <p className="text-xs text-[#625878]">Public job board · SSR</p>
            </div>
          </div>
          <Link
            href="/hiring"
            className="rounded-lg border border-[#dfd8f7] px-3 py-1.5 text-sm font-semibold text-[#29213d] hover:bg-[#f4f0ff]"
          >
            Back to Workspace
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="mb-8 rounded-2xl bg-gradient-to-br from-[#30205d] to-[#5d39d6] p-8 text-white shadow-sm">
          <Badge className="mb-3 bg-white/15 text-white">We’re hiring</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Build thoughtful tools for modern teams
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#ebe1ff] sm:text-base">
            Join Kobizo in Ho Chi Minh City or remotely across Vietnam. Every role below is rendered
            with Next.js SSR for fast loading and search engine indexing.
          </p>
        </section>

        <CareersListClient initialJobs={publishedJobs} />
      </main>
    </div>
  );
}
