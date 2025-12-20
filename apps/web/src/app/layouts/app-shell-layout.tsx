import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { TopHeader } from "@/components/navigation/top-header";
import type { PropsWithChildren } from "react";

export function AppShellLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <SidebarNav />
        <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-background/80">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_8%,hsl(var(--primary)/0.16),transparent_42%),radial-gradient(circle_at_92%_0%,hsl(var(--secondary)/0.14),transparent_34%),linear-gradient(180deg,hsl(var(--background)/0.92)_0%,hsl(var(--background)/0.98)_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(hsl(var(--border)/0.22)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.22)_1px,transparent_1px)] [background-size:36px_36px]"
          />
          <TopHeader />
          <main className="relative z-10 flex-1 px-4 py-6 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
