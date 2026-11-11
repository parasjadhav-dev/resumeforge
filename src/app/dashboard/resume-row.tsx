"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import {
  deleteResumeAction,
  duplicateResumeAction,
  renameResumeAction,
  type ActionState,
} from "./actions";

type Props = { id: string; title: string; updatedAt: string };

export function ResumeRow({ id, title, updatedAt }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [renameState, renameAction, renamePending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await renameResumeAction(prev, formData);
      if (!result.error) setRenaming(false);
      return result;
    },
    {},
  );
  const [dupState, dupAction, dupPending] = useActionState<ActionState, FormData>(
    duplicateResumeAction,
    {},
  );
  const [delState, delAction, delPending] = useActionState<ActionState, FormData>(
    deleteResumeAction,
    {},
  );

  const error = renameState.error ?? dupState.error ?? delState.error;
  const busy = renamePending || dupPending || delPending;

  return (
    <li className="space-y-1 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form action={renameAction} className="flex gap-2">
              <input type="hidden" name="id" value={id} />
              <input
                name="title"
                defaultValue={title}
                maxLength={100}
                required
                autoFocus
                aria-label="Resume title"
                className="border-input bg-background h-8 flex-1 rounded-lg border px-2.5 text-sm"
              />
              <Button type="submit" size="sm" disabled={renamePending}>
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <>
              <Link href={`/resumes/${id}/edit`} className="font-medium hover:underline">
                {title}
              </Link>
              <p className="text-muted-foreground text-xs">Updated {formatDate(updatedAt)}</p>
            </>
          )}
        </div>

        {!renaming && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setRenaming(true)} disabled={busy}>
              Rename
            </Button>
            <form action={dupAction}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" size="sm" variant="outline" disabled={busy}>
                {dupPending ? "Duplicating…" : "Duplicate"}
              </Button>
            </form>
            <form
              action={delAction}
              onSubmit={(e) => {
                if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={id} />
              <Button type="submit" size="sm" variant="destructive" disabled={busy}>
                {delPending ? "Deleting…" : "Delete"}
              </Button>
            </form>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </li>
  );
}
