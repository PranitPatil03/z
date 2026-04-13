import { AnvilLogo } from "@/components/branding/anvil-logo";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const features = [
  {
    tag: "Control Tower",
    title: "Command Center Visibility",
    description:
      "Track risk, schedule pressure, and unresolved blockers from one decision-ready view.",
    points: ["Live health indicators", "Action queue by priority"],
    layout: "md:col-span-4 md:row-span-2",
    hero: true,
    metrics: [
      { label: "Open Risks", value: "12" },
      { label: "Blocked Items", value: "7" },
      { label: "Next Escalation", value: "24h" },
    ],
    flow: [
      "Review critical queue",
      "Assign owner and due date",
      "Resolve blockers before close",
    ],
  },
  {
    tag: "Commercial",
    title: "Procurement Control",
    description:
      "Run RFQs, POs, invoice checks, and approvals with complete traceability.",
    points: ["RFQ to PO workflow", "Invoice and commitment controls"],
    layout: "md:col-span-2",
  },
  {
    tag: "Scope",
    title: "Change Order Discipline",
    description:
      "Enforce standardized approval paths before scope changes impact schedule and margin.",
    points: ["Structured review path", "Cost and schedule impact context"],
    layout: "md:col-span-2",
  },
  {
    tag: "Compliance",
    title: "SubConnect Workflows",
    description:
      "Onboard subcontractors, collect compliance evidence, and track status with fewer handoffs.",
    points: ["Invite and onboard subs", "Monitor document validity"],
    layout: "md:col-span-3",
  },
  {
    tag: "Communication",
    title: "SmartMail Operations",
    description:
      "Route project email threads through structured templates and response playbooks.",
    points: ["Template-driven responses", "Thread continuity across teams"],
    layout: "md:col-span-3",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "Default plan for new workspaces and lightweight operations.",
    highlight: false,
    features: [
      "1 SmartMail account",
      "1,500 AI credits per cycle",
      "Core AI and SmartMail sync",
      "Overage disabled",
    ],
    cta: "Start free",
    href: "/signup",
  },
  {
    name: "Growth",
    price: "Stripe",
    period: "/month",
    description: "Paid plan used for active teams managing multiple projects.",
    highlight: true,
    features: [
      "Up to 5 SmartMail accounts",
      "20,000 AI credits per cycle",
      "Overage enabled at $0.02 per unit",
      "Full workflow feature access",
    ],
    cta: "Choose Growth",
    href: "/signup",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "Advanced plan for multi-entity portfolios and governance-heavy operations.",
    highlight: false,
    features: [
      "Unlimited SmartMail accounts",
      "100,000 AI credits per cycle",
      "SSO and governance controls",
      "Dedicated success support",
    ],
    cta: "Talk to Sales",
    href: "/login",
  },
];

const workflow = [
  {
    title: "Set Up Organization and Projects",
    description:
      "Create your workspace, configure project structure, and define ownership in one setup pass.",
  },
  {
    title: "Invite Teams With Clear Roles",
    description:
      "Bring PMs, field leads, and finance into one shared operating model with role-aware access.",
  },
  {
    title: "Run Procurement and Changes",
    description:
      "Execute RFQs, commitments, and change orders using standardized approval and tracking lanes.",
  },
  {
    title: "Activate SubConnect and SmartMail",
    description:
      "Onboard subcontractors and project communications with structured workflows instead of inbox chaos.",
  },
  {
    title: "Monitor Daily and Improve Continuously",
    description:
      "Review command-center metrics, resolve exceptions early, and tighten execution every week.",
  },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f8f8] text-gray-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 bottom-0 h-[520px] w-[520px] rounded-full bg-[#fdc8b4]/35 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-[520px] w-[520px] rounded-full bg-[#bad2ff]/40 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 bg-transparent">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <AnvilLogo showWordmark={false} iconClassName="h-9 w-9 rounded-xl" />
            <span className="text-lg font-semibold tracking-tight text-gray-900">
              anvil
            </span>
          </Link>

          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center px-2 font-medium text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="group relative inline-flex h-10 items-center overflow-hidden rounded-sm bg-gray-900 px-4 font-medium text-white transition-colors hover:bg-gray-800"
            >
              <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.42)_50%,transparent_75%)] opacity-90 transition-transform duration-700 group-hover:translate-x-[170%] -translate-x-[170%]" />
              <span className="relative z-10">Sign up</span>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="max-w-4xl text-balance text-4xl font-light tracking-tight text-gray-900 sm:text-5xl lg:text-7xl">
            Build with precision.
            <br className="hidden sm:block" />
            Operate with certainty.
          </h1>
          <p className="mt-6 max-w-2xl text-balance text-base font-light leading-relaxed text-gray-500 sm:text-lg">
            anvil gives construction teams one place to run procurement,
            compliance, change control, and project communications without
            losing the execution signal.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-sm bg-gray-900 px-8 text-sm font-medium text-white transition-all hover:bg-gray-800"
            >
              <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.42)_50%,transparent_75%)] opacity-90 transition-transform duration-700 group-hover:translate-x-[170%] -translate-x-[170%]" />
              <span className="relative z-10">Get started free</span>
              <ArrowRight className="relative z-10 h-4 w-4" />
            </Link>
            <p className="text-sm text-gray-500">
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
              <h2 className="text-3xl font-normal tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
                Built For Real Project Pressure
              </h2>
              <p className="mt-4 text-base text-gray-500">
                Five core capabilities construction teams use daily to protect
                margin and maintain delivery speed.
              </p>
            </div>

            {/*
              Bento grid — 6-column base, 3 explicit rows.
              Row 1+2: hero card spans col 1-4 × row 1-2 (wide + tall anchor)
                        right column fills with two stacked narrow cards (col 5-6, one per row)
              Row 3:    two equal half-width cards side-by-side (col 1-3, col 4-6)

              Each feature object carries its own `layout` span class so the
              grid placement is data-driven, not hardcoded per-card.
            */}
            <div className="grid gap-4 md:grid-cols-6 md:grid-rows-[minmax(200px,auto)_minmax(200px,auto)_minmax(160px,auto)]">
              {features.map((item) => (
                <Card
                  key={item.title}
                  className={`overflow-hidden rounded-sm border-gray-200/90 shadow-sm backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 ${item.layout} ${
                    item.hero
                      ? "bg-gradient-to-b from-white to-gray-50/80"
                      : "bg-white/85"
                  }`}
                >
                  {/* flex-col + h-full lets content stretch to fill the grid cell */}
                  <CardHeader className="flex h-full flex-col">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                      {item.tag}
                    </p>
                    <CardTitle className="text-lg font-semibold text-gray-900 md:text-xl">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      {item.description}
                    </CardDescription>
                    <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                      {item.points.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>

                    {/* Hero extras pushed to the bottom via mt-auto so they anchor to the card floor */}
                    {item.hero ? (
                      <div className="mt-auto space-y-3 pt-6">
                        <div className="grid gap-3 sm:grid-cols-3">
                          {item.metrics?.map((metric) => (
                            <div
                              key={metric.label}
                              className="rounded-sm border border-gray-200 bg-white px-3 py-2.5"
                            >
                              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                                {metric.label}
                              </p>
                              <p className="mt-1 text-lg font-semibold text-gray-900">
                                {metric.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-sm border border-gray-200 bg-white px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                            Today&apos;s Action Sequence
                          </p>
                          <div className="mt-3 space-y-2.5">
                            {item.flow?.map((step, index) => (
                              <div
                                key={step}
                                className="flex items-center gap-2.5 text-sm text-gray-600"
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[11px] font-medium text-white">
                                  {index + 1}
                                </span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-normal tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
                How anvil Works
              </h2>
              <p className="mt-4 text-base text-gray-500">
                A practical operating flow from setup to disciplined delivery.
              </p>
            </div>

            <div className="relative mx-auto max-w-5xl">
              <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gray-200 md:block" />
              {workflow.map((step, index) => (
                <div
                  key={step.title}
                  className={`relative mb-6 rounded-sm border border-gray-200/80 bg-white/90 p-6 shadow-sm md:mb-10 md:w-[calc(50%-1.5rem)] ${
                    index % 2 === 1 ? "md:ml-auto" : ""
                  }`}
                >
                  <span
                    className={`absolute top-8 hidden h-4 w-4 rounded-full border-4 border-white bg-gray-900 md:block ${
                      index % 2 === 1 ? "-left-8" : "-right-8"
                    }`}
                  />
                  <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-6 py-20 md:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-24 bottom-0 h-[420px] w-[420px] rounded-full bg-[#fdc8b4]/30 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-[#bad2ff]/35 blur-3xl" />
          </div>
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-normal tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
                Pricing That Scales With Delivery
              </h2>
              <p className="mt-4 text-base text-gray-500">
                Start free and move up as your project volume and control needs grow.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={
                    plan.highlight
                      ? "rounded-sm border-gray-900 bg-gray-900 text-white shadow-xl md:-translate-y-4 md:scale-[1.06]"
                      : "rounded-sm border-gray-200 bg-white/95 shadow-sm"
                  }
                >
                  <CardHeader>
                    <CardTitle
                      className={
                        plan.highlight
                          ? "text-xl font-semibold text-white"
                          : "text-xl font-semibold text-gray-900"
                      }
                    >
                      {plan.name}
                    </CardTitle>
                    <CardDescription
                      className={
                        plan.highlight ? "text-gray-300" : "text-gray-500"
                      }
                    >
                      {plan.description}
                    </CardDescription>
                    <p
                      className={
                        plan.highlight
                          ? "pt-2 text-4xl font-semibold tracking-tight text-white"
                          : "pt-2 text-4xl font-semibold tracking-tight text-gray-900"
                      }
                    >
                      {plan.price}
                      <span
                        className={
                          plan.highlight
                            ? "text-base font-normal text-gray-300"
                            : "text-base font-normal text-gray-500"
                        }
                      >
                        {plan.period}
                      </span>
                    </p>
                    <ul
                      className={
                        plan.highlight
                          ? "pt-2 text-sm text-gray-200"
                          : "pt-2 text-sm text-gray-500"
                      }
                    >
                      {plan.features.map((feature) => (
                        <li key={feature} className="py-1">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      className={
                        plan.highlight
                          ? "mt-4 inline-flex h-11 items-center justify-center rounded-sm bg-white px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
                          : "mt-4 inline-flex h-11 items-center justify-center rounded-sm border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                      }
                      href={plan.href}
                    >
                      {plan.cta}
                    </Link>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative mt-6 border-t border-gray-200/80 bg-white/70">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="inline-flex">
              <AnvilLogo className="items-center" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
              Construction operations platform for procurement, compliance,
              change control, and communication in one system.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Product</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <Link className="block transition-colors hover:text-gray-900" href="/signup">
                Platform Overview
              </Link>
              <Link className="block transition-colors hover:text-gray-900" href="/signup">
                Pricing
              </Link>
              <Link className="block transition-colors hover:text-gray-900" href="/login">
                Sign in
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Company</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <Link className="block transition-colors hover:text-gray-900" href="/">
                About anvil
              </Link>
              <Link className="block transition-colors hover:text-gray-900" href="mailto:support@anvil.so">
                Contact
              </Link>
              <Link className="block transition-colors hover:text-gray-900" href="mailto:sales@anvil.so">
                Talk to sales
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <Link className="block transition-colors hover:text-gray-900" href="/">
                Privacy
              </Link>
              <Link className="block transition-colors hover:text-gray-900" href="/">
                Terms
              </Link>
              <Link className="block transition-colors hover:text-gray-900" href="/">
                Security
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200/80 py-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} anvil. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
