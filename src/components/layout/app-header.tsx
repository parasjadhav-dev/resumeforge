import { Suspense } from "react";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getSession } from "@/lib/session";
import { PageContainer } from "./page-container";
import { UserMenu } from "./user-menu";

/** The signed-in user's menu. Reads the session, so it streams in separately from the header. */
async function HeaderUser() {
  const session = await getSession();
  return (
    <UserMenu name={session?.user?.name} email={session?.user?.email} signOut={signOutAction} />
  );
}

/** Top bar for signed-in pages: logo, theme switch, and account menu. */
export function AppHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
      <PageContainer className="flex h-14 items-center justify-between gap-4">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Suspense fallback={<div className="bg-muted size-9 rounded-full" aria-hidden="true" />}>
            <HeaderUser />
          </Suspense>
        </div>
      </PageContainer>
    </header>
  );
}
