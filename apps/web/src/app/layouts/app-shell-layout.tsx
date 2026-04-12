import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { TopHeader } from "@/components/navigation/top-header";
import type { PropsWithChildren } from "react";

export function AppShellLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-screen overflow-hidden">
      <div className="flex h-full">
        <SidebarNav />
        <div className="shell-main-surface flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
