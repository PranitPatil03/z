"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { moduleRegistry } from "@/config/module-registry";
import { ModuleChecklistCard } from "@/features/app/components/module-checklist-card";
import {
  useHealthStatus,
  useReadinessStatus,
} from "@/features/app/hooks/use-system-health";
import { Activity, FolderKanban, Server, ShieldCheck } from "lucide-react";
import Link from "next/link";

const dashboardSkeletonKeys = [
  "module-skeleton-1",
  "module-skeleton-2",
  "module-skeleton-3",
  "module-skeleton-4",
  "module-skeleton-5",
  "module-skeleton-6",
];

export function DashboardPage() {
  const health = useHealthStatus();
  const readiness = useReadinessStatus();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardDescription>Module Count</CardDescription>
            <CardTitle className="text-3xl">{moduleRegistry.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <FolderKanban className="h-3.5 w-3.5" />
            Module-wise plan active
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardDescription>Backend Health</CardDescription>
            <CardTitle className="text-3xl">
              {health.isError ? "Offline" : "Online"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Server className="h-3.5 w-3.5" />
            {health.isError
              ? "Health endpoint unreachable"
              : "Connected to API"}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardDescription>Readiness</CardDescription>
            <CardTitle className="text-3xl">
              {readiness.isError ? "Blocked" : "Ready"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {readiness.isError
              ? "Readiness checks failed"
              : "Environment checks passing"}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardDescription>M0 Status</CardDescription>
            <CardTitle className="text-3xl">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            Theme, API, state, shell complete
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Module Delivery Board</h1>
            <p className="text-sm text-muted-foreground">
              Track each module with backend route alignment and delivery
              checklist quality gates.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/app/module/m0-foundation">Open M0 Module</Link>
          </Button>
        </div>

        {health.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dashboardSkeletonKeys.map((key) => (
              <Skeleton key={key} className="h-52" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {moduleRegistry.map((module) => (
              <ModuleChecklistCard key={module.key} module={module} />
            ))}
          </div>
        )}
      </section>

      <section>
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle>Current Delivery Standard</CardTitle>
            <CardDescription>
              Every module must follow typed contracts, role-safe UX, and
              reusable shadcn-style component architecture before being marked
              complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="default">Type-safe API</Badge>
            <Badge variant="default">Role-aware UX</Badge>
            <Badge variant="default">Reusable components</Badge>
            <Badge variant="default">Error and loading states</Badge>
            <Badge variant="default">Quality gates</Badge>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
