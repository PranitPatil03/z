import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const highlights = [
  {
    icon: BriefcaseBusiness,
    title: "Operations Control",
    description:
      "End-to-end visibility for project execution, subcontractor workflows, and delivery risk.",
  },
  {
    icon: BarChart3,
    title: "Financial Confidence",
    description:
      "RFQ through 3-way match with clearer approvals, reconciliations, and audit-grade traceability.",
  },
  {
    icon: ShieldCheck,
    title: "Contract-Safe Workflows",
    description:
      "Role-aware decisions, protected transitions, and tenant-safe policy enforcement by design.",
  },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-xl font-semibold">Foreman</p>
              <p className="text-xs text-muted-foreground">
                Construction operations intelligence
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/app">Open Console</Link>
          </Button>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Badge className="w-fit" variant="secondary">
              M0 Frontend Foundation Started
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Professional-grade construction workflows with a premium control
              experience.
            </h1>
            <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              This frontend is now structured for enterprise execution: typed
              API boundaries, clean state architecture, reusable design system
              components, and module-driven delivery aligned to backend
              contracts.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="shadow-glow">
                <Link href="/app">
                  Enter App Shell
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="subtle">
                <Link href="/app/module/m0-foundation">View M0 Module</Link>
              </Button>
            </div>
          </div>

          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>M0 Delivery Focus</CardTitle>
              <CardDescription>
                Foundation first: shell, state, typed API client, and premium
                design-system baseline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-border/70 bg-background/80 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
