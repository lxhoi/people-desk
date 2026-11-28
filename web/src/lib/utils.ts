import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDurationHours(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0 && seconds > 0) return "<1m";
  const hrs = Math.floor(minutes / 60);
  const mins = String(minutes % 60).padStart(2, "0");
  return `${hrs}h ${mins}m`;
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
