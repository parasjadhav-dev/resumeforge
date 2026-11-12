"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Runs a server action and tells the user the outcome with a toast. */
function withToast(action: Action, onSuccess?: () => void): Action {
  return async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.error) toast.error(result.error);
    else {
      if (result.message) toast.success(result.message);
      onSuccess?.();
    }
    return result;
  };
}

export function ResumeCard({ id, title, templateId, updatedAt }: Props) {
  const template = resolveTemplateId(templateId);
  const templateName = TEMPLATES.find((t) => t.id === template)?.name ?? "Classic";
  const editHref = `/resumes/${id}/edit`;

  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [, renameAction, renamePending] = useActionState(
    withToast(renameResumeAction, () => setRenaming(false)),
    {},
  );
  const [, dupAction, dupPending] = useActionState(withToast(duplicateResumeAction), {});
  const [, deleteAction, deletePending] = useActionState(withToast(deleteResumeAction), {});
  const [, startDelete] = useTransition();

  const busy = renamePending || dupPending || deletePending;

  function confirmDelete() {
    setConfirmingDelete(false);
    const formData = new FormData();
    formData.set("id", id);
    startDelete(() => deleteAction(formData));
  }

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
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the resume and everything in it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={confirmDelete}>
              Delete resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
