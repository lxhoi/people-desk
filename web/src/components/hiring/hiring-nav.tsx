"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type HiringTab = "jobs" | "workflows" | "assessments" | "templates";

const TABS: { key: HiringTab; label: string; href: string }[] = [
  { key: "jobs", label: "Job List", href: "/hiring" },
  { key: "workflows", label: "Workflow Settings", href: "/hiring?tab=workflows" },
  { key: "assessments", label: "Assessments", href: "/hiring?tab=assessments" },
  { key: "templates", label: "Email Templates", href: "/hiring?tab=templates" },
];

export function HiringNav({ active }: { active: HiringTab }) {
  return (
    <nav
      aria-label="Hiring sections"
      className="inline-flex flex-wrap gap-1 rounded-xl border border-[#e7e1f7] bg-white p-1"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
            active === tab.key
              ? "bg-[#613ae5] text-white"
              : "text-[#625878] hover:bg-[#f4f0ff] hover:text-[#29213d]"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
