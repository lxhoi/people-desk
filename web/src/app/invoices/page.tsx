"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppMutation, useAppState } from "@/lib/queries";
import type { Invoice } from "@/lib/types";
import { formatDurationHours, uid } from "@/lib/utils";

function InvoicesContent() {
  const searchParams = useSearchParams();
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();

  const initialProj = searchParams.get("project") || "";
  const initialFrom = searchParams.get("from") || "2026-11-01";
  const initialTo = searchParams.get("to") || "2026-12-31";

  const [createOpen, setCreateOpen] = useState(Boolean(initialProj));
  const [project, setProject] = useState(initialProj || state.projects[0]?.id || "atlas");
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [recipient, setRecipient] = useState("Northstar Labs");
  const [rate, setRate] = useState(65);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (initialProj) {
      setProject(initialProj);
      setFromDate(initialFrom);
      setToDate(initialTo);
      setCreateOpen(true);
    }
  }, [initialProj, initialFrom, initialTo]);

  const matchingEntries = useMemo(
    () =>
      state.entries.filter(
        (e) => e.project === project && e.day >= fromDate && e.day <= toDate
      ),
    [state.entries, project, fromDate, toDate]
  );

  const previewSeconds = matchingEntries.reduce((s, e) => s + e.seconds, 0);
  const previewAmount = Math.round((previewSeconds / 3600) * rate * 100) / 100;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = state.projects.find((p) => p.id === project);
    const num = `INV-2026-${String(105 + state.invoices.length)}`;
    const newInv: Invoice = {
      id: `inv-${uid().slice(0, 8)}`,
      number: num,
      date: toDate,
      project,
      sender: "Kobizo JSC",
      recipient,
      service: `${proj?.name ?? project} delivery (${fromDate} to ${toDate})`,
      seconds: previewSeconds,
      status: "Sent",
      currency: "USD",
      rate,
      amount: previewAmount,
    };
    await mutation.mutateAsync((draft) => {
      draft.invoices.unshift(newInv);
    });
    setCreateOpen(false);
    setViewingInvoice(newInv);
    notify(`Invoice ${num} generated.`);
  };

  const markPaid = async (id: string) => {
    await mutation.mutateAsync((draft) => {
      const inv = draft.invoices.find((i) => i.id === id);
      if (inv) inv.status = "Paid";
    });
    notify("Invoice marked as Paid.");
  };

  const buildInvoiceText = (inv: Invoice) => {
    const proj = state.projects.find((p) => p.id === inv.project);
    const taskLines = state.entries
      .filter((e) => e.project === inv.project)
      .slice(0, 10)
      .map((e) => {
        const t = state.tasks.find((x) => x.id === e.task)?.name ?? e.task;
        return `- ${e.day} | ${t} | ${formatDurationHours(e.seconds)}`;
      });
    return [
      `INVOICE ${inv.number}`,
      `Date: ${inv.date}`,
      `From: ${inv.sender}`,
      `To: ${inv.recipient}`,
      `Project: ${proj?.name ?? inv.project}`,
      `Service: ${inv.service}`,
      "",
      "WORK DETAILS",
      ...(taskLines.length ? taskLines : ["- Fixed retainer / logged delivery hours"]),
      "",
      `Total hours: ${formatDurationHours(inv.seconds)}`,
      `Rate: $${inv.rate}/hr`,
      `TOTAL AMOUNT DUE: $${inv.amount.toLocaleString()} ${inv.currency}`,
    ].join("\n");
  };

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#6c5baa]">Insights</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#29213d]">Invoices</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create invoice</Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Client invoices</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setViewingInvoice(inv)}
                    className="cursor-pointer font-bold text-[#5833d8] hover:underline"
                  >
                    {inv.number}
                  </button>
                  <p className="text-xs text-[#625878]">{inv.date}</p>
                </TableCell>
                <TableCell>{inv.recipient}</TableCell>
                <TableCell>{formatDurationHours(inv.seconds)}</TableCell>
                <TableCell className="font-semibold">
                  ${inv.amount.toLocaleString()} {inv.currency}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      inv.status === "Paid"
                        ? "success"
                        : inv.status === "Overdue"
                        ? "danger"
                        : "default"
                    }
                  >
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setViewingInvoice(inv)}>
                      View
                    </Button>
                    {inv.status !== "Paid" ? (
                      <Button size="sm" variant="secondary" onClick={() => markPaid(inv.id)}>
                        Mark Paid
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Generate Invoice from Project & Date Range */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateInvoice} className="grid gap-3.5">
            <DialogHeader>
              <DialogTitle>Prepare client invoice</DialogTitle>
              <DialogDescription>
                Select project and date range to calculate billable hours and amount due.
              </DialogDescription>
            </DialogHeader>
            <Field label="Project">
              <Select value={project} onChange={(e) => setProject(e.target.value)}>
                {state.projects
                  .filter((p) => !p.deleted)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From date">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </Field>
              <Field label="To date">
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client / Recipient">
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </Field>
              <Field label="Hourly rate (USD)">
                <Input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value) || 0)}
                  required
                />
              </Field>
            </div>
            <div className="rounded-xl border border-[#efeafd] bg-[#faf8fe] p-3 text-sm">
              <p>
                Matched entries: <strong>{matchingEntries.length}</strong> · Hours:{" "}
                <strong>{formatDurationHours(previewSeconds)}</strong>
              </p>
              <p className="mt-1 font-bold text-[#4c2cc7]">
                Estimated total: ${previewAmount.toLocaleString()} USD
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">View invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fixed Invoice Template View */}
      <Dialog open={Boolean(viewingInvoice)} onOpenChange={(o) => !o && setViewingInvoice(null)}>
        <DialogContent className="w-[min(720px,calc(100vw-28px))]">
          {viewingInvoice ? (
            <>
              <DialogHeader>
                <DialogTitle>Invoice {viewingInvoice.number}</DialogTitle>
                <DialogDescription>
                  {viewingInvoice.sender} → {viewingInvoice.recipient} · {viewingInvoice.date}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 rounded-xl border border-[#efeafd] bg-[#faf8fe] p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-[#625878]">Service</p>
                    <p className="font-semibold text-[#29213d]">{viewingInvoice.service}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase text-[#625878]">Total amount due</p>
                    <p className="text-xl font-bold text-[#4c2cc7]">
                      ${viewingInvoice.amount.toLocaleString()} {viewingInvoice.currency}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#625878]">
                  Hours: {formatDurationHours(viewingInvoice.seconds)} · Rate: $
                  {viewingInvoice.rate}/hr · Status: {viewingInvoice.status}
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => notify(`Invoice ${viewingInvoice.number} sent by email.`)}
                >
                  Send by email
                </Button>
                <Button variant="secondary" onClick={() => window.print()}>
                  Print
                </Button>
                <Button asChild variant="secondary">
                  <a
                    download={`${viewingInvoice.number}.txt`}
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                      buildInvoiceText(viewingInvoice)
                    )}`}
                  >
                    Download
                  </a>
                </Button>
                <Button onClick={() => setViewingInvoice(null)}>Close</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-sm text-[#625878]">Loading invoices...</div>}>
        <InvoicesContent />
      </Suspense>
    </AppShell>
  );
}
