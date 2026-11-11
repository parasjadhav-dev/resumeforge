import { TEMPLATE_IDS, type TemplateId } from "./schema";

/** Template catalogue shown in the editor's switcher. Both are single-column and ATS-friendly. */
export const TEMPLATES: readonly { id: TemplateId; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "Centered header, black rules. Traditional." },
  { id: "modern", name: "Modern", description: "Left-aligned header, blue accents. Clean." },
];

export const DEFAULT_TEMPLATE_ID: TemplateId = "classic";

/** Falls back to the default for unknown ids (e.g. data from an older version). */
export function resolveTemplateId(id: string | undefined | null): TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(id ?? "")
    ? (id as TemplateId)
    : DEFAULT_TEMPLATE_ID;
}
