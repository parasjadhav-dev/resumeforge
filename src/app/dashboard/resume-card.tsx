"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { resolveTemplateId, TEMPLATES } from "@/shared/templates";
import {
  deleteResumeAction,
  duplicateResumeAction,
  renameResumeAction,
  type ActionState,
} from "./actions";
import { ResumeThumb } from "./resume-thumb";

type Props = { id: string; title: string; templateId: string; updatedAt: string };

export function ResumeCard({ id, title, templateId, updatedAt }: Props) {
  const template = resolveTemplateId(templateId);
  const templateName = TEMPLATES.find((t) => t.id === template)?.name ?? "Classic";
  const editHref = `/resumes/${id}/edit`;

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
    <li className="bg-card shadow-card hover:shadow-pop flex flex-col overflow-hidden rounded-xl border transition-shadow">
      {/* The whole thumbnail opens the editor; the title below is the link for keyboards and screen readers. */}
      <Link
        href={editHref}
        tabIndex={-1}
        aria-hidden="true"
        className="bg-muted/60 hover:bg-muted block px-4 py-5 transition-colors"
      >
        <ResumeThumb templateId={template} />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {renaming ? (
          <form action={renameAction} className="flex gap-2">
            <input type="hidden" name="id" value={id} />
            <Input
              name="title"
              defaultValue={title}
              maxLength={100}
              required
              autoFocus
              aria-label="Resume title"
              className="min-w-0 flex-1"
            />
            <Button type="submit" size="sm" disabled={renamePending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <div className="min-w-0 space-y-1.5">
            <Link
              href={editHref}
              className="block truncate font-semibold hover:underline"
              title={title}
            >
              {title}
            </Link>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Badge variant="secondary">{templateName}</Badge>
              <span>Updated {formatDate(updatedAt)}</span>
            </div>
          </div>
        )}

        {!renaming && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
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

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
