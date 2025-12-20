import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { moduleMap } from "@/config/module-registry";
import { ArrowLeft, CheckCircle2, Circle, Route, Sparkle } from "lucide-react";
import Link from "next/link";

interface ModulePageProps {
  moduleKey?: string;
}

export function ModulePage({ moduleKey }: ModulePageProps) {
  const module = moduleKey ? moduleMap.get(moduleKey) : undefined;

  if (!module) {
    return (
      <Card className="mx-auto max-w-2xl glass-card">
        <CardHeader>
          <CardTitle>Module not found</CardTitle>
          <CardDescription>
            Choose a valid module from the sidebar board.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const Icon = module.icon;
  const completedCount = module.progress > 0 ? 1 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link href="/app">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to module board
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/15 p-2 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{module.title}</h1>
              <p className="text-sm text-muted-foreground">{module.subtitle}</p>
            </div>
          </div>
        </div>
        <Badge variant={module.progress > 0 ? "success" : "outline"}>
          {module.priority}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Execution Checklist</CardTitle>
            <CardDescription>
              Progress {module.progress}% · {completedCount}/
              {module.checklist.length} checklist anchors complete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {module.checklist.map((task, index) => {
              const complete = index === 0 && module.progress > 0;
              return (
                <div
                  key={task}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-3"
                >
                  {complete ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <p className="text-sm text-foreground">{task}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Backend Contract</CardTitle>
            <CardDescription>
              Route groups required for this module.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {module.backendRoutes.map((route) => (
              <div
                key={route}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2"
              >
                <Route className="h-3.5 w-3.5 text-primary" />
                <code className="text-xs font-medium text-foreground">
                  {route}
                </code>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-secondary/30">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkle className="h-4 w-4 text-secondary" />
            Premium UX rule: no feature is considered complete without loading,
            empty, error, and role-aware states.
          </div>
          <Separator orientation="vertical" className="hidden h-8 lg:block" />
          <Button asChild variant="secondary">
            <Link href="/app">Review all modules</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
