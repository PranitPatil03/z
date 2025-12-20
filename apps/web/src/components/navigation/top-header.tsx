"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useHealthStatus,
  useReadinessStatus,
  useServiceInfo,
} from "@/features/app/hooks/use-system-health";
import { useUiStore } from "@/store/ui-store";
import { Menu, Search } from "lucide-react";

export function TopHeader() {
  const toggleSidebarCollapsed = useUiStore(
    (state) => state.toggleSidebarCollapsed,
  );
  const serviceInfo = useServiceInfo();
  const health = useHealthStatus();
  const readiness = useReadinessStatus();

  const readinessVariant = readiness.isError ? "warning" : "success";

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Button variant="outline" size="icon" onClick={toggleSidebarCollapsed}>
          <Menu className="h-4 w-4" />
        </Button>

        <div className="relative hidden w-full max-w-md sm:block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search modules, entities, and actions"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant={health.isError ? "warning" : "success"}>
            {health.isError ? "API Offline" : "API Healthy"}
          </Badge>
          <Badge variant={readinessVariant}>
            {readiness.isError ? "Not Ready" : "Ready"}
          </Badge>
          <ThemeToggle />
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 md:flex">
            <Avatar>
              <AvatarFallback>PM</AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-foreground">
                Program Manager
              </p>
              <p className="text-[11px] text-muted-foreground">
                {serviceInfo.data?.name ?? "Foreman"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
