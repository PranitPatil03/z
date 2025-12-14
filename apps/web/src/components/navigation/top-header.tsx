"use client";

import { OrganizationSwitcher } from "@/components/navigation/organization-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHealthStatus } from "@/features/app/hooks/use-system-health";
import { authClient } from "@/lib/auth-client";
import { useUiStore } from "@/store/ui-store";
import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

export function TopHeader() {
  const router = useRouter();
  const toggleSidebarCollapsed = useUiStore(
    (state) => state.toggleSidebarCollapsed,
  );
  const health = useHealthStatus();
  const { data: session } = authClient.useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-card/90 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Button variant="ghost" size="icon" onClick={toggleSidebarCollapsed}>
          <Menu className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant={health.isError ? "warning" : "success"}
            className="hidden sm:flex"
          >
            {health.isError ? "API Offline" : "Live"}
          </Badge>

          <OrganizationSwitcher
            alwaysShow
            className="min-w-[150px] lg:hidden"
            selectClassName="h-8 bg-background text-xs"
          />

          <ThemeToggle />

          {user && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 lg:hidden">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
