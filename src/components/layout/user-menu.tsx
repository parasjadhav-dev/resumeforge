"use client";

import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** "Asha Rao" -> "AR", "asha@example.com" -> "A". */
export function initialsOf(name?: string | null, email?: string | null): string {
  const source = (name?.trim() || email?.split("@")[0] || "?").trim();
  const words = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 1);
  return letters.toUpperCase();
}

/**
 * The signed-in user's menu. `signOut` is a server action passed in by the server component that
 * renders this, so this file never imports server-only code.
 */
export function UserMenu({
  name,
  email,
  signOut,
}: {
  name?: string | null;
  email?: string | null;
  signOut: () => Promise<void>;
}) {
  const signOutForm = useRef<HTMLFormElement>(null);
  const { theme, setTheme } = useTheme();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="hover:bg-muted data-popup-open:bg-muted focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none focus-visible:ring-3"
        >
          {/*
            The initials are drawn with CSS (data-initials), not written as text. The button's name
            is "Account menu"; real text here would be "visible text that is not in the name",
            which voice-control users trip over.
          */}
          <span
            aria-hidden="true"
            data-initials={initialsOf(name, email)}
            className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-xs font-semibold before:content-[attr(data-initials)]"
          />
          <ChevronDown className="text-muted-foreground size-4" aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="space-y-0.5">
              {name && <span className="text-foreground block text-sm font-medium">{name}</span>}
              {email && (
                <span className="text-muted-foreground block truncate text-xs">{email}</span>
              )}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/dashboard" />}>
            <LayoutDashboard aria-hidden="true" />
            Your resumes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme ?? "system"}
              onValueChange={(value) => setTheme(String(value))}
            >
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOutForm.current?.requestSubmit()}>
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu, because the menu's contents are removed from the page when it closes. */}
      <form ref={signOutForm} action={signOut} className="hidden" />
    </>
  );
}
