"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useToast } from "@/components/providers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useAppMutation } from "@/lib/queries";
import { applicationSchema } from "@/lib/schemas";
import type { Job } from "@/lib/types";
import { uid } from "@/lib/utils";
import Link from "next/link";

type ApplicationForm = z.infer<typeof applicationSchema>;

export function ApplyDialog({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const mutation = useAppMutation();
  const { notify } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { name: "", email: "", cv: "", answer: "" },
  });

  const onSubmit = async (values: ApplicationForm) => {
    const id = `candidate-${uid().slice(0, 8)}`;
    const token = `demo-${id}-candidate-link`;
    const now = new Date().toISOString();
    await mutation.mutateAsync((draft) => {
      draft.hiring.applications.unshift({
        id,
        job: job.id,
        name: values.name,
        email: values.email,
        cv: values.cv,
        answer: values.answer,
        token,
        stages: job.stages.map((s, idx) => ({ ...s, id: `stage-${idx}` })),
        stage: 0,
        outcome: "active",
        created: now,
        reviews: {},
        tests: {},
        interviews: {},
        events: [{ date: now, message: "Application submitted via Public Careers" }],
        messages: [],
      });
    });
    setPortalToken(token);
    reset();
    notify("Application submitted!");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPortalToken(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg">Apply for this role</Button>
      </DialogTrigger>
      <DialogContent>
        {portalToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Application received</DialogTitle>
              <DialogDescription>
                Thank you for applying to {job.title}. Your candidate portal link is ready below.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-[#e7e1f7] bg-[#f8f6fd] p-4 text-sm">
              <p className="font-semibold text-[#29213d]">Candidate Portal link</p>
              <p className="mt-1 text-[#625878]">
                Track your application status, complete assessments, and book interviews here:
              </p>
              <Link
                href={`/candidate-portal?token=${encodeURIComponent(portalToken)}`}
                className="mt-2 inline-block font-semibold text-[#613ae5] underline"
              >
                Open Candidate Portal →
              </Link>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>Apply for {job.title}</DialogTitle>
              <DialogDescription>
                {job.department} · {job.location}
              </DialogDescription>
            </DialogHeader>
            <Field label="Full name" error={errors.name?.message}>
              <Input placeholder="e.g. Minh Anh Nguyen" {...register("name")} />
            </Field>
            <Field label="Email address" error={errors.email?.message}>
              <Input type="email" placeholder="you@example.com" {...register("email")} />
            </Field>
            <Field label="Experience summary / CV highlights" error={errors.cv?.message}>
              <Textarea
                rows={3}
                placeholder="Summarize your relevant experience, key projects, and skills..."
                {...register("cv")}
              />
            </Field>
            <Field label="Why are you interested in this role?" error={errors.answer?.message}>
              <Textarea
                rows={3}
                placeholder="Share what excites you about this team and role..."
                {...register("answer")}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Submit application
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
