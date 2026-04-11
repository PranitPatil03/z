"use client";

import { PortalAuthGuard } from "@/components/auth/portal-auth-guard";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { clearPortalSession } from "@/lib/auth/portal-session";
import { cn } from "@/lib/utils";
import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

const NAV_ITEMS = [
  { href: "/portal/overview", label: "Overview" },
  { href: "/portal/compliance", label: "Compliance" },
  { href: "/portal/pay-applications", label: "Pay Applications" },
  { href: "/portal/daily-logs", label: "Daily Logs" },
  { href: "/portal/profile", label: "Profile" },
];

export default function PortalProtectedLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Suspense fallback={<LoadingState title="Loading portal" rows={2} />}>
      <PortalAuthGuard>
        <div className="min-h-screen bg-background">
          <header className="border-b border-border bg-card/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Subcontractor Portal
                </p>
              </div>

              <nav className="hidden items-center gap-1 sm:flex">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      pathname === item.href ||
                        pathname.startsWith(`${item.href}/`)
                        ? "bg-muted text-foreground"
                        : null,
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearPortalSession();
                  router.replace("/portal/login");
                }}
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        </div>
      </PortalAuthGuard>
    </Suspense>
  );
}
