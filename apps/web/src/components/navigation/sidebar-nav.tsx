"use client";

import { AnvilLogo } from "@/components/branding/anvil-logo";
import { SidebarAccountMenu } from "@/components/navigation/sidebar-account-menu";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS, moduleRegistry } from "@/config/module-registry";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav() {
  const pathname = usePathname();
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore(
    (state) => state.toggleSidebarCollapsed,
  );

  return (
    <aside
      className={cn(
        "shell-sidebar-surface sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/80 p-3 lg:flex",
        isSidebarCollapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "mb-4 flex",
          isSidebarCollapsed
            ? "flex-col items-center gap-2"
            : "items-center justify-between px-1",
        )}
      >
        <AnvilLogo
          className={cn(isSidebarCollapsed ? "justify-center" : "")}
          iconClassName={cn(
            isSidebarCollapsed
              ? "h-9 w-9 rounded-xl"
              : "h-9 w-auto rounded-none border-0 bg-transparent",
          )}
          wordmarkClassName=""
          showWordmark={!isSidebarCollapsed}
        />

        {!isSidebarCollapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={toggleSidebarCollapsed}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}

        {isSidebarCollapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-2 h-8 w-8 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={toggleSidebarCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
        {NAV_GROUPS.map((group) => {
          const items = moduleRegistry.filter(
            (m) =>
              m.group === group.key &&
              !["billing", "activity-feed", "notifications"].includes(m.key),
          );
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
                  const isDashboardModule = module.routePath === "/dashboard";
                  const isActive =
                    isDashboardModule
                      ? pathname === "/dashboard"
                      : pathname.startsWith(module.routePath);
                  const Icon = module.icon;

                  return (
                    <Link
                      key={module.key}
                      href={module.routePath}
                      title={isSidebarCollapsed ? module.title : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors",
                        isActive
                          ? "border border-border/80 bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
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
