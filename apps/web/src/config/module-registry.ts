import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  Camera,
  ClipboardList,
  CreditCard,
  Gauge,
  Mail,
  Receipt,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";

export type ModulePriority = "P1" | "P2" | "P3" | "P4";

export interface ModuleDefinition {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  routePath: string;
  priority: ModulePriority;
  progress: number;
  backendRoutes: string[];
  checklist: string[];
}

export const moduleRegistry: ModuleDefinition[] = [
  {
    key: "m0-foundation",
    title: "M0 Foundation",
    subtitle: "App shell, design system, typed API, and state architecture.",
    icon: Gauge,
    routePath: "/app/module/m0-foundation",
    priority: "P1",
    progress: 72,
    backendRoutes: ["/openapi.json", "/docs", "/health", "/health/ready"],
    checklist: [
      "Create apps/web with strict TypeScript and build pipeline",
      "Set up shadcn-style component architecture and theme tokens",
      "Configure React Query + Zustand stores",
      "Create typed API client with standardized error handling",
      "Ship polished shell layout with module navigation",
    ],
  },
  {
    key: "m1-auth",
    title: "M1 Identity and Session",
    subtitle: "Internal cookie auth and portal bearer auth flows.",
    icon: ShieldCheck,
    routePath: "/app/module/m1-auth",
    priority: "P1",
    progress: 0,
    backendRoutes: ["/auth", "/auth/oauth", "/portal"],
    checklist: [
      "Build internal session bootstrap and route guards",
      "Implement portal token lifecycle and protected navigation",
      "Unify unauthorized and session-expired UX",
    ],
  },
  {
    key: "m2-workspace",
    title: "M2 Workspace",
    subtitle: "Organization and project context with team membership views.",
    icon: Building2,
    routePath: "/app/module/m2-workspace",
    priority: "P1",
    progress: 0,
    backendRoutes: ["/organizations", "/projects"],
    checklist: [
      "Build org switcher and project selector",
      "Build project list/detail and member management",
      "Add role-aware action visibility",
    ],
  },
  {
    key: "m3-ops-intelligence",
    title: "M3 Ops Intelligence",
    subtitle:
      "Notifications, activity feed, command center, and audit visibility.",
    icon: Activity,
    routePath: "/app/module/m3-ops-intelligence",
    priority: "P1",
    progress: 0,
    backendRoutes: [
      "/notifications",
      "/activity-feed",
      "/command-center",
      "/audit-log",
    ],
    checklist: [
      "Build notification center and preference controls",
      "Build filterable activity feed and entity timeline",
      "Build command center trend and health surfaces",
    ],
  },
  {
    key: "m4-procurement-ap",
    title: "M4 Procurement and AP",
    subtitle: "RFQs, purchase orders, receipts, invoices, and match runs.",
    icon: Receipt,
    routePath: "/app/module/m4-procurement-ap",
    priority: "P2",
    progress: 0,
    backendRoutes: [
      "/rfqs",
      "/purchase-orders",
      "/receipts",
      "/invoices",
      "/match-runs",
    ],
    checklist: [
      "Build list/detail/create flows for each financial entity",
      "Build lifecycle transitions with explicit confirmations",
      "Add exception and override UX with reason capture",
    ],
  },
  {
    key: "m5-change-orders",
    title: "M5 Change Orders",
    subtitle: "End-to-end change order lifecycle and approvals.",
    icon: Workflow,
    routePath: "/app/module/m5-change-orders",
    priority: "P2",
    progress: 0,
    backendRoutes: ["/change-orders"],
    checklist: [
      "Build lifecycle board and detail screen",
      "Build submit and decision flows with role guards",
      "Build attachment operations and timeline history",
    ],
  },
  {
    key: "m6-budgets",
    title: "M6 Budgets",
    subtitle:
      "Cost-code operations, variance, reconciliation, and alert controls.",
    icon: BarChart3,
    routePath: "/app/module/m6-budgets",
    priority: "P2",
    progress: 0,
    backendRoutes: ["/budgets"],
    checklist: [
      "Build cost-code and cost-entry management views",
      "Build variance and reconciliation visualizations",
      "Build narrative queue and alert dedupe UX",
    ],
  },
  {
    key: "m7-sitesnaps-ai",
    title: "M7 SiteSnap and AI",
    subtitle: "Field intelligence workflows with storage and async jobs.",
    icon: Camera,
    routePath: "/app/module/m7-sitesnaps-ai",
    priority: "P3",
    progress: 0,
    backendRoutes: ["/site-snaps", "/storage", "/ai"],
    checklist: [
      "Build site snap and observation workflows",
      "Build file upload/download lifecycle UX",
      "Build deterministic async job polling UX",
    ],
  },
  {
    key: "m8-subconnect-internal",
    title: "M8 SubConnect Internal",
    subtitle: "Subcontractor ops, compliance templates, and internal reviews.",
    icon: Users,
    routePath: "/app/module/m8-subconnect-internal",
    priority: "P3",
    progress: 0,
    backendRoutes: ["/subcontractors", "/subconnect", "/compliance"],
    checklist: [
      "Build subcontractor management and invitations",
      "Build compliance template and review views",
      "Build internal pay app and daily log review views",
    ],
  },
  {
    key: "m9-portal",
    title: "M9 Portal",
    subtitle: "External subcontractor portal experience.",
    icon: Briefcase,
    routePath: "/app/module/m9-portal",
    priority: "P4",
    progress: 0,
    backendRoutes: ["/portal"],
    checklist: [
      "Build registration/login/invitation flows",
      "Build portal compliance and profile surfaces",
      "Build portal pay app and daily log workflows",
    ],
  },
  {
    key: "m10-smartmail-integrations",
    title: "M10 SmartMail and Integrations",
    subtitle: "Comms and connector operations for enterprise workflows.",
    icon: Mail,
    routePath: "/app/module/m10-smartmail-integrations",
    priority: "P3",
    progress: 0,
    backendRoutes: ["/smartmail", "/integrations", "/auth/oauth"],
    checklist: [
      "Build SmartMail account and thread management UI",
      "Build template and draft generation UX",
      "Build integration setup and reconnect flows",
    ],
  },
  {
    key: "m11-billing",
    title: "M11 Billing",
    subtitle: "Usage visibility, plans, and Stripe operations.",
    icon: CreditCard,
    routePath: "/app/module/m11-billing",
    priority: "P2",
    progress: 0,
    backendRoutes: ["/billing"],
    checklist: [
      "Build billing record and usage views",
      "Build subscription plan switch UX",
      "Build webhook event admin controls",
    ],
  },
  {
    key: "m12-release",
    title: "M12 Release Quality",
    subtitle: "Accessibility, test hardening, and release gates.",
    icon: ClipboardList,
    routePath: "/app/module/m12-release",
    priority: "P1",
    progress: 0,
    backendRoutes: ["/openapi.json", "/health", "/health/ready"],
    checklist: [
      "Add smoke E2E and workflow integration tests",
      "Pass accessibility and responsiveness checks",
      "Run release quality gate and go-live checklist",
    ],
  },
];

export const moduleMap = new Map(
  moduleRegistry.map((module) => [module.key, module]),
);
