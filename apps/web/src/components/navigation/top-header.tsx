"use client";

import { OrganizationSwitcher } from "@/components/navigation/organization-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { moduleRegistry } from "@/config/module-registry";
import { authClient } from "@/lib/auth-client";
import { Activity, Bell, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

export function TopHeader() {
  const router = useRouter();
  const pathname = usePathname();
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

  const headerMeta = useMemo(() => {
    const exactModuleMatch = moduleRegistry.find(
      (module) => module.routePath === pathname,
    );
    if (exactModuleMatch) {
      return {
        title: exactModuleMatch.title,
        subtitle: exactModuleMatch.subtitle,
      };
    }

    const nestedModuleMatch = moduleRegistry
      .filter((module) => pathname.startsWith(`${module.routePath}/`))
      .sort((a, b) => b.routePath.length - a.routePath.length)[0];

    if (nestedModuleMatch) {
      return {
        title: nestedModuleMatch.title,
        subtitle: nestedModuleMatch.subtitle,
      };
    }

    if (pathname.startsWith("/organization-setup")) {
      return {
        title: "Organization Setup",
        subtitle: "Create or switch the active organization for this workspace.",
      };
    }

    if (pathname.startsWith("/account-settings")) {
      return {
        title: "Account Settings",
        subtitle: "Manage your profile, appearance preferences, and billing access.",
      };
    }

    if (pathname.startsWith("/integrations")) {
      return {
        title: "Integrations",
        subtitle: "Connect external systems and manage integration health.",
      };
    }

    if (pathname.startsWith("/command-center")) {
      return {
        title: "Command Center",
        subtitle: "Monitor portfolio metrics, risk, and activity in real time.",
      };
    }

    return {
      title: "Workspace",
      subtitle: "Operational overview across active modules.",
    };
  }, [pathname]);

  return (
    <header className="shell-main-surface-soft sticky top-0 z-20 backdrop-blur-xl">
      <div className="flex min-h-[64px] items-center gap-3 px-4 py-2 lg:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground lg:text-2xl">
            {headerMeta.title}
          </h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground lg:text-sm">
            {headerMeta.subtitle}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border/80 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground"
            title="Activity feed"
            aria-label="Activity feed"
            onClick={() => router.push("/activity-feed")}
          >
            <Activity className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border/80 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => router.push("/notifications")}
          >
            <Bell className="h-4 w-4" />
          </Button>

          <OrganizationSwitcher
            alwaysShow
            className="min-w-[150px] lg:hidden"
            selectClassName="h-8 bg-background text-xs"
          />

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
