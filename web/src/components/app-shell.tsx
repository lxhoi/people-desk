"use client";

import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Clock,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Receipt,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useAppMutation, useAppState, useResetAppState } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/time", label: "Time tracking", icon: Clock },
      { href: "/projects", label: "Projects & tasks", icon: FolderKanban },
      { href: "/leave", label: "Leave", icon: CalendarDays },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/invoices", label: "Invoices", icon: Receipt },
    ],
  },
  {
    label: "Recruiting",
    items: [
      { href: "/hiring", label: "Hiring", icon: Briefcase },
      { href: "/careers", label: "Public Careers", icon: Globe },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const resetMutation = useResetAppState();
  const { notify } = useToast();

  const handleRoleChange = (role: Role) => {
    mutation.mutate((draft) => {
      draft.role = role;
    });
    notify(`Switched demo role to ${role === "admin" ? "Admin / HR" : role}`);
  };

  const handleReset = async () => {
    await resetMutation.mutateAsync();
    notify("Demo data reset to initial state.");
  };

  return (
    <div className="flex min-h-screen bg-[#f6f4fb]">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-[#e7e1f7] bg-white p-5 lg:flex">
        <div>
          <Link href="/" className="mb-7 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#613ae5] font-bold text-white">
              K
            </div>
            <div>
              <p className="text-sm font-bold text-[#29213d]">Kobizo</p>
              <p className="text-xs text-[#625878]">Workspace</p>
            </div>
          </Link>

          <nav className="grid gap-6" aria-label="Main navigation">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8b81a3]">
                  {group.label}
                </p>
                <div className="grid gap-1">
                  {group.items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                          active
                            ? "bg-[#efeaff] text-[#4c2cc7]"
                            : "text-[#574d70] hover:bg-[#f6f4fb] hover:text-[#29213d]"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-[#efeafd] pt-4">
          <p className="text-xs font-semibold text-[#29213d]">peopleDesk</p>
          <p className="mt-0.5 text-xs text-[#625878]">Next.js · Local-first store</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#e7e1f7] bg-white/90 px-6 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-[#29213d]">peopleDesk</span>
            <Badge>Next.js App Router</Badge>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#625878]">
              <span>Demo role</span>
              <Select
                aria-label="Demo role"
                value={state?.role ?? "admin"}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                className="h-8 w-36 text-xs"
              >
                <option value="admin">Admin / HR</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
              </Select>
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              title="Reset local demo data"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#efeaff] text-xs font-bold text-[#4c2cc7]">
              HL
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
