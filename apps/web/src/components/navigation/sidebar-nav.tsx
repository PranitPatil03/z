"use client";

import { Badge } from "@/components/ui/badge";
import { moduleRegistry } from "@/config/module-registry";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav() {
  const pathname = usePathname();
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);

  return (
    <aside
      className={cn(
        "hidden border-r border-border/70 bg-card/90 px-3 py-4 backdrop-blur lg:block",
        isSidebarCollapsed ? "w-[88px]" : "w-[300px]",
      )}
    >
      <div className="mb-4 flex items-center justify-between px-2">
        <Link
          href="/app"
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <span className="rounded-lg bg-primary/15 p-1.5 text-primary">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          {!isSidebarCollapsed && <span>Foreman Console</span>}
        </Link>
      </div>

      <nav className="space-y-1">
        {moduleRegistry.map((module) => {
          const active = pathname === module.routePath;
          const Icon = module.icon;

          return (
            <Link
              key={module.key}
              href={module.routePath}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                active
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {module.title}
                  </span>
                  <Badge variant={module.progress > 0 ? "success" : "outline"}>
                    {module.priority}
                  </Badge>
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
