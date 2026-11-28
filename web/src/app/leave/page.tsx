"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppMutation, useAppState } from "@/lib/queries";
import { leaveRequestSchema } from "@/lib/schemas";
import { PEOPLE } from "@/lib/seed";
import { uid } from "@/lib/utils";

function LeaveContent() {
  const searchParams = useSearchParams();
  const requestedDay = searchParams.get("day") || "2026-11-28";
  const { data: state } = useAppState();
  const mutation = useAppMutation();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof leaveRequestSchema>>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      from: requestedDay,
      to: requestedDay,
      type: "Annual leave",
      notes: "",
    },
  });

  useEffect(() => {
    if (searchParams.get("day")) {
      form.reset({
        from: requestedDay,
        to: requestedDay,
        type: "Annual leave",
        notes: "",
      });
    }
  }, [requestedDay, searchParams, form]);

  const onSubmit = async (values: z.infer<typeof leaveRequestSchema>) => {
    await mutation.mutateAsync((draft) => {
      draft.leave.unshift({
        id: `leave-${uid().slice(0, 8)}`,
        person: "linh",
        from: values.from,
        to: values.to,
        type: values.type,
        status: "Pending",
        notes: values.notes,
      });
    });
    notify("Leave request submitted.");
    setOpen(false);
    form.reset();
  };

  const handleDecision = async (id: string, status: "Approved" | "Rejected") => {
    await mutation.mutateAsync((draft) => {
      const item = draft.leave.find((l) => l.id === id);
      if (item) item.status = status;
    });
    notify(`Leave request ${status.toLowerCase()}.`);
  };

  const canApprove = state.role === "admin" || state.role === "manager";
  const visibleRequests = canApprove
    ? state.leave
    : state.leave.filter((l) => l.person === "linh");

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#6c5baa]">Workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#29213d]">Leave requests</h1>
          <p className="mt-1 text-sm text-[#625878]">
            Request time off for missing hours or review team leave requests.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Request leave</Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Leave history</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              {canApprove ? <TableHead className="text-right">Action</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRequests.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold">
                  {PEOPLE[item.person] ?? item.person}
                </TableCell>
                <TableCell>
                  {item.from === item.to ? item.from : `${item.from} – ${item.to}`}
                </TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell className="text-xs text-[#625878]">{item.notes}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === "Approved"
                        ? "success"
                        : item.status === "Rejected"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                {canApprove ? (
                  <TableCell className="text-right">
                    {item.status === "Pending" ? (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDecision(item.id, "Approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDecision(item.id, "Rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#8b81a3]">—</span>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3.5" noValidate>
            <DialogHeader>
              <DialogTitle>Request leave</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From" error={form.formState.errors.from?.message}>
                <Input type="date" {...form.register("from")} />
              </Field>
              <Field label="To" error={form.formState.errors.to?.message}>
                <Input type="date" {...form.register("to")} />
              </Field>
            </div>
            <Field label="Leave type">
              <Select {...form.register("type")}>
                <option value="Annual leave">Annual leave</option>
                <option value="Sick leave">Sick leave</option>
                <option value="Personal leave">Personal leave</option>
              </Select>
            </Field>
            <Field label="Notes" error={form.formState.errors.notes?.message}>
              <Textarea rows={3} {...form.register("notes")} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeavePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-sm text-[#625878]">Loading leave...</div>}>
        <LeaveContent />
      </Suspense>
    </AppShell>
  );
}
