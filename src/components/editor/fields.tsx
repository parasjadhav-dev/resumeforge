"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { moveItem, parseTags, removeAt, replaceAt } from "@/lib/array";

const MAX_BULLETS = 15; // matches the resume schema

const inputClass =
  "border-input bg-background placeholder:text-muted-foreground w-full rounded-lg border px-2.5 py-1.5 text-sm disabled:opacity-50";

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
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
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
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={inputClass}
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
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4"
      />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
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
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseTags(e.target.value));
        }}
        onBlur={() => setText(values.join(", "))}
        aria-describedby={`${id}-hint`}
        className={inputClass}
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

/** A titled section card. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
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
  renderItem,
}: {
  noun: string;
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  addLabel: string;
  emptyText: string;
  max: number;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-muted-foreground text-sm">{emptyText}</p>}
      {items.map((item, index) => {
        const label = `${noun} ${index + 1}`;
        return (
          <div key={item.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{label}</h3>
              <MoveControls
                label={label}
                index={index}
                count={items.length}
                onMove={(to) => onChange(moveItem(items, index, to))}
                onRemove={() => onChange(removeAt(items, index))}
              />
            </div>
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
      <legend className="text-sm font-medium">{label}</legend>
      {bullets.map((bullet, index) => (
        <div key={index} className="flex items-start gap-2">
          <textarea
            value={bullet}
            rows={2}
            maxLength={500}
            aria-label={`${label} ${index + 1}`}
            onChange={(e) => onChange(replaceAt(bullets, index, e.target.value))}
            className={inputClass}
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
