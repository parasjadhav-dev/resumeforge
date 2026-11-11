"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createResumeAction, type ActionState } from "./actions";

export function NewResumeForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createResumeAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="title"
          maxLength={100}
          placeholder="New resume title (optional)"
          aria-label="New resume title"
          className="border-input bg-background h-8 flex-1 rounded-lg border px-2.5 text-sm"
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
    </form>
  );
}
