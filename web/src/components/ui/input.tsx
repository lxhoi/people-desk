import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg border border-[#dfd8f7] bg-white px-3 py-1.5 text-sm text-[#29213d] placeholder:text-[#8f86a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#613ae5] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[84px] w-full rounded-lg border border-[#dfd8f7] bg-white px-3 py-2 text-sm text-[#29213d] placeholder:text-[#8f86a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#613ae5] disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg border border-[#dfd8f7] bg-white px-3 py-1.5 text-sm text-[#29213d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#613ae5] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#29213d]">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-[#9f2338]">{error}</span> : null}
    </label>
  );
}
