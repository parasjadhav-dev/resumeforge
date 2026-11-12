"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { moveItem, parseTags, removeAt, replaceAt } from "@/lib/array";
import { cn } from "@/lib/utils";
import type { EditorSectionKey } from "@/shared/resume-progress";
import { sectionDomId, StatusDot, useEditorUi } from "./editor-ui";
import { ReviewNote, useEntryReview } from "./review-context";

const MAX_BULLETS = 15; // matches the resume schema

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  disabled?: boolean;
  maxLength?: number;
};

export function TextField({ label, value, onChange, type = "text", ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  hint?: string;
};

export function TextArea({ label, value, onChange, rows = 4, hint, ...rest }: TextAreaProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Label className="w-fit cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value)} />
      {label}
    </Label>
  );
}

/** Comma-separated tags (skills, technologies). Keeps raw text locally so typing commas feels natural. */
export function TagField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState(values.join(", "));
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseTags(e.target.value));
        }}
        onBlur={() => setText(values.join(", "))}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        Separate with commas.
      </p>
    </div>
  );
}

type MoveControlsProps = {
  label: string;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
};

export function MoveControls({ label, index, count, onMove, onRemove }: MoveControlsProps) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${label} down`}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDown />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

/**
 * A collapsible section card. The whole header toggles it. Collapsed, it shows a one-line summary
 * of what is inside; its content stays on the page (hidden) so nothing typed is ever lost.
 */
export function Section({
  id,
  title,
  description,
  children,
}: {
  id: EditorSectionKey;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { meta, isOpen, toggle } = useEditorUi();
  const open = isOpen(id);
  const domId = sectionDomId(id);
  const showStatus = id !== "template";

  return (
    <section
      id={domId}
      aria-labelledby={`${domId}-title`}
      className="bg-card shadow-card scroll-mt-[calc(var(--editor-header)+3.5rem)] rounded-xl border"
    >
      <div className="relative flex items-center gap-3 p-4 sm:p-5">
        {showStatus && <StatusDot done={meta[id].done} />}
        <div className="min-w-0 flex-1">
          <h2 id={`${domId}-title`} className="text-lg font-semibold">
            {/* The button is stretched over the whole header (after:inset-0), so all of it is clickable. */}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`${domId}-panel`}
              aria-describedby={`${domId}-note`}
              onClick={() => toggle(id)}
              className="rounded-sm text-left after:absolute after:inset-0 after:rounded-xl"
            >
              {title}
              {showStatus && (
                <span className="sr-only">{meta[id].done ? ", has content" : ", empty"}</span>
              )}
            </button>
          </h2>
          <p id={`${domId}-note`} className="text-muted-foreground truncate text-sm">
            {open ? description : meta[id].summary}
          </p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "text-muted-foreground size-5 shrink-0 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </div>
      <div id={`${domId}-panel`} hidden={!open} className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    </section>
  );
}

/** Shows why an imported entry deserves a second look (renders nothing for ordinary entries). */
function EntryReviewNote({ id, what }: { id: string; what: string }) {
  const { reasons, markChecked } = useEntryReview(id);
  return <ReviewNote reasons={reasons} onChecked={markChecked} what={what} />;
}

/**
 * Generic editor for a list of entries with add / remove / reorder.
 * `noun` is used for accessible labels, e.g. "experience entry 2".
 */
export function EntryList<T extends { id: string }>({
  noun,
  items,
  onChange,
  createItem,
  addLabel,
  emptyText,
  max,
  subtitle,
  renderItem,
}: {
  noun: string;
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  addLabel: string;
  emptyText: string;
  max: number;
  /** A short line describing an entry (e.g. "Intern · Acme"), shown beside its label. */
  subtitle?: (item: T) => string;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-muted-foreground text-sm">{emptyText}</p>}
      {items.map((item, index) => {
        const label = `${noun} ${index + 1}`;
        const detail = subtitle?.(item).trim();
        return (
          <div key={item.id} className="bg-muted/30 space-y-3 rounded-lg border p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-2">
                <h3 className="shrink-0 text-sm font-semibold">{label}</h3>
                {detail && (
                  <p
                    className="text-muted-foreground truncate text-sm"
                    data-testid="entry-subtitle"
                  >
                    {detail}
                  </p>
                )}
              </div>
              <MoveControls
                label={label}
                index={index}
                count={items.length}
                onMove={(to) => onChange(moveItem(items, index, to))}
                onRemove={() => onChange(removeAt(items, index))}
              />
            </div>
            <EntryReviewNote id={item.id} what={label.toLowerCase()} />
            {renderItem(item, (patch) => onChange(replaceAt(items, index, { ...item, ...patch })))}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={items.length >= max}
        onClick={() => onChange([...items, createItem()])}
      >
        <Plus /> {addLabel}
      </Button>
      {items.length >= max && (
        <p className="text-muted-foreground text-xs">Limit of {max} reached.</p>
      )}
    </div>
  );
}

/** Editor for a list of bullet points (achievements, details). */
export function BulletsField({
  label,
  bullets,
  onChange,
}: {
  label: string;
  bullets: string[];
  onChange: (bullets: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm leading-none font-medium">{label}</legend>
      {bullets.map((bullet, index) => (
        <div key={index} className="flex items-start gap-2">
          <Textarea
            value={bullet}
            rows={2}
            maxLength={500}
            aria-label={`${label} ${index + 1}`}
            onChange={(e) => onChange(replaceAt(bullets, index, e.target.value))}
          />
          <MoveControls
            label={`${label.toLowerCase()} ${index + 1}`}
            index={index}
            count={bullets.length}
            onMove={(to) => onChange(moveItem(bullets, index, to))}
            onRemove={() => onChange(removeAt(bullets, index))}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={bullets.length >= MAX_BULLETS}
        onClick={() => onChange([...bullets, ""])}
      >
        <Plus /> Add bullet
      </Button>
    </fieldset>
  );
}
