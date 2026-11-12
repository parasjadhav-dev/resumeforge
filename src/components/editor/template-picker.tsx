"use client";

import { TEMPLATES } from "@/shared/templates";
import type { TemplateId } from "@/shared/schema";
import { Section } from "./fields";

/** Radio group for choosing the resume template. Applies to the preview and the PDF. */
export function TemplatePicker({
  value,
  onChange,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}) {
  return (
    <Section id="template" title="Template" description="Both are single-column and ATS-friendly.">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Resume template</legend>
        {TEMPLATES.map((t) => (
          <label
            key={t.id}
            className="has-[:checked]:border-primary has-[:checked]:ring-primary flex cursor-pointer gap-3 rounded-lg border p-3 has-[:checked]:ring-1 has-[:focus-visible]:outline-2"
          >
            <input
              type="radio"
              name="template"
              value={t.id}
              checked={value === t.id}
              onChange={() => onChange(t.id)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">{t.name}</span>
              <span className="text-muted-foreground block text-xs">{t.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </Section>
  );
}
