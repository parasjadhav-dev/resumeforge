import type { ReactNode } from "react";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";

/** Frame for signed-in pages: header, content, footer, on the brand-glow background. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-brand-glow flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
      <AppFooter />
    </div>
  );
}
