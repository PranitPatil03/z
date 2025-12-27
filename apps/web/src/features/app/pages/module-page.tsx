import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { moduleMap } from "@/config/module-registry";
import { ArrowLeft } from "lucide-react";
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
            Choose a valid module from the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const Icon = module.icon;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
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

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>{module.progress}% complete</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${module.progress}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Navigate to{" "}
            <Link
              href={module.routePath}
              className="text-primary hover:underline"
            >
              {module.routePath}
            </Link>{" "}
            to use this module.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
