import { cn } from "@/lib/utils";
import type { TemplateId } from "@/shared/schema";

/** One block on the drawn page: a rule (the heading) and a few grey text lines. */
function ThumbSection({ rule, lines }: { rule: string; lines: string[] }) {
  return (
    <div className="mt-2.5 space-y-1">
      <div className={cn("h-[2px] w-full rounded-full", rule)} />
      {lines.map((width, i) => (
        <div key={i} className={cn("h-[2px] rounded-full bg-neutral-300", width)} />
      ))}
    </div>
  );
}

/**
 * A small drawing of a resume page in the template's own style, so each card shows what
 * kind of resume it is at a glance. Purely decorative; the real preview is in the editor.
 */
export function ResumeThumb({ templateId }: { templateId: TemplateId }) {
  const modern = templateId === "modern";
  const ink = modern ? "bg-blue-900" : "bg-neutral-800";
  const rule = modern ? "bg-blue-900" : "bg-neutral-700";

  return (
    <div
      aria-hidden="true"
      className="mx-auto aspect-[210/297] w-28 rounded-[3px] bg-white p-3 shadow-md ring-1 ring-black/5"
    >
      <div className={cn("flex flex-col gap-1", modern ? "items-start" : "items-center")}>
        <div className={cn("h-1.5 w-1/2 rounded-full", ink)} />
        <div className="h-[2px] w-2/3 rounded-full bg-neutral-300" />
      </div>
      <ThumbSection rule={rule} lines={["w-full", "w-5/6", "w-2/3"]} />
      <ThumbSection rule={rule} lines={["w-full", "w-4/5", "w-full", "w-1/2"]} />
      <ThumbSection rule={rule} lines={["w-3/4", "w-full"]} />
    </div>
  );
}
