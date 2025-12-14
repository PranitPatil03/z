import { AnvilLogo } from "@/components/branding/anvil-logo";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Factory,
  FileSpreadsheet,
  MailCheck,
  Radar,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Radar,
    title: "Live Project Pulse",
    description:
      "Track budget drift, delays, quality risks, and field blockers in one command surface.",
  },
  {
    icon: WalletCards,
    title: "Procurement Control",
    description:
      "Run RFQs, POs, invoices, receipts, and match runs with audit-ready traceability.",
  },
  {
    icon: ClipboardCheck,
    title: "Change Order Discipline",
    description:
      "Standardize submissions, approvals, and impact tracking before scope turns into rework.",
  },
  {
    icon: MailCheck,
    title: "SmartMail Workspace",
    description:
      "Connect inboxes, sync project threads, and launch consistent responses with templates.",
  },
  {
    icon: ShieldCheck,
    title: "SubConnect Governance",
    description:
      "Manage subcontractor onboarding, compliance evidence, and invitation flows from a single lane.",
  },
  {
    icon: FileSpreadsheet,
    title: "Budget Narratives",
    description:
      "Turn line-item changes into clear, stakeholder-ready narratives without manual copy-paste.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$0",
    description: "For teams standing up their first shared workspace.",
    highlight: false,
    features: [
      "Core modules",
      "1 active project",
      "Basic dashboard",
      "Community support",
    ],
  },
  {
    name: "Growth",
    price: "$99",
    description: "For active operations teams managing multiple jobs.",
    highlight: true,
    features: [
      "Everything in Starter",
      "Unlimited projects",
      "Role-aware approvals",
      "Automation workflows",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For multi-entity portfolios with advanced controls.",
    highlight: false,
    features: [
      "Everything in Growth",
      "SSO and policy controls",
      "Custom data retention",
      "Dedicated success partner",
    ],
  },
];

const workflow = [
  {
    title: "Connect Your Workspace",
    description:
      "Create your organization, invite teams, and bring projects online in minutes.",
  },
  {
    title: "Standardize Execution",
    description:
      "Use shared workflows for procurement, compliance, and change control across projects.",
  },
  {
    title: "Operate From Signal",
    description:
      "Review live metrics and action queues daily to reduce risk before it compounds.",
  },
];

const modules = [
  "Dashboard",
  "Procurement",
  "Change Orders",
  "Budgets",
  "SubConnect",
  "SmartMail",
];

const faqs = [
  {
    q: "How quickly can we roll out anvil?",
    a: "Most teams activate in a day, then expand module by module over the first two weeks.",
  },
  {
    q: "Can we start with one module and expand later?",
    a: "Yes. You can begin with dashboard and procurement, then add SmartMail, SubConnect, and budget tooling as needed.",
  },
  {
    q: "Does anvil support role-based access?",
    a: "Yes. Owner, admin, and member roles are built in, with organization-scoped controls.",
  },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f9f6f2] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#ffd7bc]/55 blur-3xl" />
        <div className="absolute -left-24 top-[36%] h-[420px] w-[420px] rounded-full bg-[#d9e2f2]/45 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-[#f9f6f2]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <AnvilLogo wordmarkClassName="text-slate-900" />
          </Link>

          <nav className="flex items-center gap-8 text-sm">
            <Link
              href="/login"
              className="text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-900"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-7xl">
            Build with precision.
            <br className="hidden sm:block" />
            Operate with certainty.
          </h1>
          <p className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-slate-600 sm:text-lg">
            anvil gives construction teams one place to run procurement,
            compliance, change control, and project communications without
            losing the execution signal.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-sm bg-gradient-to-r from-[#ff6b2d] to-[#ff8a4d] px-8 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,107,45,0.35)] transition-all hover:translate-y-[-1px] hover:shadow-[0_10px_28px_rgba(255,107,45,0.45)]"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm text-slate-600">
              Already onboarded?{" "}
              <Link className="underline underline-offset-4" href="/login">
                Sign in to your workspace
              </Link>
            </p>
          </div>
        </section>

        <section className="relative px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                Built For Real Project Pressure
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Purpose-built modules that stay aligned from field activity to
                financial close.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <Card
                  key={item.title}
                  className="border-slate-200/90 bg-white/80 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <span className="rounded-lg bg-[#fff0e7] p-2 text-[#ff6b2d]">
                        <item.icon className="h-4 w-4" />
                      </span>
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="mt-10 rounded-xl border border-slate-200/80 bg-white/70 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Factory className="h-4 w-4 text-[#ff6b2d]" />
                Workspace Modules
              </div>
              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3 lg:grid-cols-6">
                {modules.map((module) => (
                  <div
                    key={module}
                    className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-center"
                  >
                    {module}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                How anvil Works
              </h2>
              <p className="mt-4 text-base text-slate-600">
                A focused execution loop from setup to continuous delivery.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {workflow.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-xl border border-slate-200/80 bg-white/75 p-6"
                >
                  <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1f232b] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                Pricing That Scales With Delivery
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Start free and move up as your project volume and control needs grow.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={
                    plan.highlight
                      ? "border-[#ff6b2d]/40 bg-white"
                      : "border-slate-200 bg-white/85"
                  }
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      {plan.description}
                    </CardDescription>
                    <p className="pt-2 text-4xl font-semibold tracking-tight text-slate-900">
                      {plan.price}
                    </p>
                    <ul className="pt-2 text-sm text-slate-600">
                      {plan.features.map((feature) => (
                        <li key={feature} className="py-1">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 pb-24 md:pb-28">
          <div className="mx-auto max-w-2xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-sm border border-slate-200 bg-white px-5 py-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-900">
                    {item.q}
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-8 text-center text-sm text-slate-500">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>anvil</span>
        </div>
        Built for construction teams that need speed without losing control.
      </footer>
    </div>
  );
}
