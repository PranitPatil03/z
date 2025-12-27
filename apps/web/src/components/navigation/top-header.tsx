"use client";

import { OrganizationSwitcher } from "@/components/navigation/organization-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { moduleMap, moduleRegistry } from "@/config/module-registry";
import { authClient } from "@/lib/auth-client";
import { useHeaderStore } from "@/store/header-store";
import { Activity, Bell, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

interface HeaderMeta {
  title: string;
  subtitle: string;
}

const PATH_HEADER_OVERRIDES: Array<{
  test: (pathname: string) => boolean;
  meta: HeaderMeta;
}> = [
  {
    test: (pathname) => pathname.startsWith("/notifications/preferences"),
    meta: {
      title: "Notification Preferences",
      subtitle: "Control alert channels, cadence, and notification rules.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/projects/"),
    meta: {
      title: "Project Details",
      subtitle: "Review project scope, members, documents, and activity.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/change-orders/"),
    meta: {
      title: "Change Order Details",
      subtitle: "Track approvals, scope impacts, and timeline changes.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/invoices/"),
    meta: {
      title: "Invoice Details",
      subtitle: "Inspect invoice line items, status, and payment history.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/purchase-orders/"),
    meta: {
      title: "Purchase Order Details",
      subtitle: "Review commitments, vendor data, and fulfillment progress.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/rfqs/"),
    meta: {
      title: "RFQ Details",
      subtitle: "Compare quotes, deadlines, and package requirements.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/receipts/"),
    meta: {
      title: "Receipt Details",
      subtitle: "Validate deliveries, quantities, and receipt status.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/match-runs/"),
    meta: {
      title: "Match Run Details",
      subtitle: "Resolve invoice, PO, and receipt matching exceptions.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/site-snaps/"),
    meta: {
      title: "Site Snap Details",
      subtitle: "Review field captures, observations, and issue context.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/smartmail/") && pathname !== "/smartmail",
    meta: {
      title: "SmartMail Thread",
      subtitle: "Read thread context and coordinate next actions.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/organization-setup"),
    meta: {
      title: "Organization Setup",
      subtitle: "Create or switch the active organization for this workspace.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/account-settings"),
    meta: {
      title: "Account Settings",
      subtitle: "Manage your profile, appearance preferences, and billing access.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/integrations"),
    meta: {
      title: "Integrations",
      subtitle: "Connect external systems and manage integration health.",
    },
  },
  {
    test: (pathname) => pathname.startsWith("/command-center"),
    meta: {
      title: "Command Center",
      subtitle: "Monitor portfolio metrics, risk, and activity in real time.",
    },
  },
  {
    test: (pathname) =>
      pathname.startsWith("/subconnect/subcontractors/") &&
      pathname !== "/subconnect/subcontractors",
    meta: {
      title: "Subcontractor Detail",
      subtitle: "Profile, portal invites, and invitation history.",
    },
  },
  {
    test: (pathname) => pathname === "/subconnect/subcontractors",
    meta: {
      title: "SubConnect Ops",
      subtitle: "Subcontractor onboarding and compliance operations.",
    },
  },
];

function resolveHeaderMeta(pathname: string): HeaderMeta {
  if (pathname.startsWith("/module/")) {
    const moduleKey = pathname.split("/")[2] ?? "";
    const moduleDefinition = moduleMap.get(moduleKey);

    if (moduleDefinition) {
      return {
        title: moduleDefinition.title,
        subtitle: moduleDefinition.subtitle,
      };
    }

    return {
      title: "Module Workspace",
      subtitle: "Detailed module context and operational execution view.",
    };
  }

  const override = PATH_HEADER_OVERRIDES.find((item) => item.test(pathname));
  if (override) {
    return override.meta;
  }

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

  return {
    title: "Workspace",
    subtitle: "Operational overview across active modules.",
  };
}

export function TopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const routePathOverride = useHeaderStore((state) => state.routePathOverride);
  const titleOverride = useHeaderStore((state) => state.titleOverride);
  const subtitleOverride = useHeaderStore((state) => state.subtitleOverride);

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

  const headerMeta = useMemo(() => resolveHeaderMeta(pathname), [pathname]);
  const hasMatchingOverride = routePathOverride === pathname;
  const resolvedTitle =
    hasMatchingOverride && titleOverride ? titleOverride : headerMeta.title;
  const resolvedSubtitle =
    hasMatchingOverride && subtitleOverride !== null
      ? subtitleOverride
      : headerMeta.subtitle;

  return (
    <header className="shell-main-surface-soft sticky top-0 z-20 backdrop-blur-xl">
      <div className="flex min-h-[64px] items-center gap-3 px-4 py-2 lg:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground lg:text-2xl">
            {resolvedTitle}
          </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground lg:text-base">
            {resolvedSubtitle}
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
