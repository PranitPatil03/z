"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { authClient } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { Building2, UserCircle2 } from "lucide-react";
import Link from "next/link";

export default function AccountSettingsPage() {
  const { data: session } = authClient.useSession();
  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );

  const user = session?.user;

  if (!user) {
    return (
      <EmptyState
        icon={UserCircle2}
        title="No user session"
        description="Sign in again to view account settings."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Settings"
        description="Review account profile and workspace organization access."
      />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Name
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {user.name ?? "Not provided"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Email
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {user.email}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 className="h-4 w-4" />
          Organization Access
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Active organization ID: {activeOrganizationId ?? "No active organization"}
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href="/organization-setup">Manage organizations</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
