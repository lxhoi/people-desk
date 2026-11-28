import type { Metadata } from "next";
import Link from "next/link";
import { CareerDetailClient } from "@/components/careers/career-detail-client";
import { SEED_JOBS } from "@/lib/seed";

export function generateStaticParams() {
  return SEED_JOBS.filter((j) => j.status === "published").map((job) => ({
    id: job.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = SEED_JOBS.find((j) => j.id === id && j.status === "published");
  if (!job) {
    return { title: "Open Role · Kobizo Careers" };
  }
  return {
    title: `${job.title} (${job.department}) · Kobizo Careers`,
    description: job.description,
  };
}

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seedJob = SEED_JOBS.find((j) => j.id === id) ?? null;

  return (
    <div className="min-h-screen bg-[#f6f4fb]">
      <header className="border-b border-[#e7e1f7] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/careers" className="text-sm font-semibold text-[#613ae5] hover:underline">
            ← All open roles
          </Link>
          <Link
            href="/hiring"
            className="rounded-lg border border-[#dfd8f7] px-3 py-1.5 text-sm font-semibold text-[#29213d] hover:bg-[#f4f0ff]"
          >
            Back to Workspace
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <CareerDetailClient jobId={id} initialJob={seedJob} />
      </main>
    </div>
  );
}
