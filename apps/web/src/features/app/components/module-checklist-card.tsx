import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ModuleDefinition } from "@/config/module-registry";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

interface ModuleChecklistCardProps {
  module: ModuleDefinition;
}

export function ModuleChecklistCard({ module }: ModuleChecklistCardProps) {
  const Icon = module.icon;

  return (
    <Card className="glass-card h-full border-border/70">
      <CardHeader>
        <div className="mb-3 flex items-center justify-between">
          <div className="rounded-md bg-primary/15 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <Badge variant={module.progress > 0 ? "success" : "outline"}>
            {module.priority}
          </Badge>
        </div>
        <CardTitle className="text-base">{module.title}</CardTitle>
        <CardDescription>{module.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {module.checklist.slice(0, 3).map((item, index) => (
          <div
            key={item}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            {index === 0 && module.progress > 0 ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4" />
            )}
            <span>{item}</span>
          </div>
        ))}
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Progress {module.progress}%
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href={module.routePath}>
            Open
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
