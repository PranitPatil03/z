"use client";

import { AnvilLogo } from "@/components/branding/anvil-logo";
import { SidebarAccountMenu } from "@/components/navigation/sidebar-account-menu";
import { NAV_GROUPS, moduleRegistry } from "@/config/module-registry";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav() {
  const pathname = usePathname();
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/60 bg-card px-2 py-4 lg:flex",
        isSidebarCollapsed ? "w-[60px]" : "w-[220px]",
      )}
    >
      {/* Logo */}
      <div className="mb-4 px-2">
        <AnvilLogo
          className={cn(isSidebarCollapsed ? "justify-center" : "")}
          iconClassName="h-7 w-7 rounded-lg"
          wordmarkClassName="text-sm font-semibold text-foreground"
          showWordmark={!isSidebarCollapsed}
        />
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const items = moduleRegistry.filter((m) => m.group === group.key);
          if (items.length === 0) return null;

          return (
            <div key={group.key}>
              {!isSidebarCollapsed && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((module) => {
                  const isDashboardModule = module.routePath === "/app";
                  const isActive =
                    isDashboardModule
                      ? pathname === "/app" || pathname.startsWith("/app/dashboard")
                      : pathname.startsWith(module.routePath);
                  const Icon = module.icon;

                  return (
                    <Link
                      key={module.key}
                      href={module.routePath}
                      title={isSidebarCollapsed ? module.title : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isSidebarCollapsed && (
                        <span className="truncate">{module.title}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-3 border-t border-border/60 pt-3">
        <SidebarAccountMenu isSidebarCollapsed={isSidebarCollapsed} />
      </div>
    </aside>
  );
}
