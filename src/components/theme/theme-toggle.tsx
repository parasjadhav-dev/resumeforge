"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/** True once running in the browser, so server and first client render agree. */
const useIsClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/** A compact three-way switch: Light, Dark, or follow the system. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const ready = useIsClient();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn("bg-muted inline-flex rounded-lg p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = ready && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors",
              selected && "bg-card text-foreground shadow-card",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
