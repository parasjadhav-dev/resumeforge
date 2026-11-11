"use client";

import { FilePlus2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createResumeAction, type ActionState } from "./actions";

export function NewResumeForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createResumeAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="bg-card shadow-card flex h-full flex-col gap-4 rounded-xl border p-5"
    >
      <div className="flex items-start gap-3">
        <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FilePlus2 className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-0.5">
          <label htmlFor={inputId} className="block font-semibold">
            Start from scratch
          </label>
          <p className="text-muted-foreground text-sm">
            Name it, then fill in each section in the guided editor.
          </p>
        </div>
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex gap-2">
          <Input
            id={inputId}
            name="title"
            maxLength={100}
            placeholder="New resume title (optional)"
            aria-label="New resume title"
            className="flex-1"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "New resume"}
          </Button>
        </div>
        {state.error && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
