import { Logo } from "@/components/brand/logo";
import { PageContainer } from "./page-container";

export function AppFooter() {
  return (
    <footer className="mt-12 border-t">
      <PageContainer className="text-muted-foreground flex flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <Logo showWordmark className="[&_span]:text-sm" />
        <p>AI suggestions are always yours to review. Nothing changes until you accept it.</p>
      </PageContainer>
    </footer>
  );
}
