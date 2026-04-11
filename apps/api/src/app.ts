import cors, { type CorsOptions } from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import {
  type ApiRouterMount,
  buildOpenApiDocument,
  renderOpenApiHtml,
} from "./lib/openapi";
import { errorHandler } from "./middleware/error-handler";
import {
  aiLimiter,
  authLimiter,
  billingLimiter,
  standardLimiter,
} from "./middleware/rate-limit";
import { requestId } from "./middleware/request-id";
import {
  activityFeedRouter,
  aiRouter,
  auditLogRouter,
  authRouter,
  billingRouter,
  budgetsRouter,
  changeOrdersRouter,
  commandCenterRouter,
  complianceRouter,
  integrationsRouter,
  invoicesRouter,
  matchRunsRouter,
  notificationsRouter,
  oauthRouter,
  organizationsRouter,
  permissionsRouter,
  portalRouter,
  projectsRouter,
  purchaseOrdersRouter,
  receiptsRouter,
  rfqsRouter,
  siteSnapsRouter,
  smartMailRouter,
  storageRouter,
  subconnectRouter,
  subcontractorsRouter,
} from "./routes";
import { healthRouter } from "./routes/health";

export const app: Express = express();

const configuredCorsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localNetworkOriginPattern =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$/;

const corsOrigin: CorsOptions["origin"] = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (configuredCorsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  if (env.NODE_ENV !== "production" && localNetworkOriginPattern.test(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin not allowed: ${origin}`));
};

const openApiRouterMounts: ApiRouterMount[] = [
  {
    path: "/auth",
    router: authRouter,
    tag: "Auth",
    description: "Authentication and session routes managed by Better Auth",
  },
  {
    path: "/health",
    router: healthRouter,
    tag: "Health",
  },
  {
    path: "/portal",
    router: portalRouter,
    tag: "Portal",
  },
  {
    path: "/activity-feed",
    router: activityFeedRouter,
    tag: "ActivityFeed",
  },
  {
    path: "/ai",
    router: aiRouter,
    tag: "AI",
  },
  {
    path: "/organizations",
    router: organizationsRouter,
    tag: "Organizations",
  },
  {
    path: "/permissions",
    router: permissionsRouter,
    tag: "Permissions",
  },
  {
    path: "/projects",
    router: projectsRouter,
    tag: "Projects",
  },
  {
    path: "/rfqs",
    router: rfqsRouter,
    tag: "RFQs",
  },
  {
    path: "/purchase-orders",
    router: purchaseOrdersRouter,
    tag: "PurchaseOrders",
  },
  {
    path: "/invoices",
    router: invoicesRouter,
    tag: "Invoices",
  },
  {
    path: "/match-runs",
    router: matchRunsRouter,
    tag: "MatchRuns",
  },
  {
    path: "/receipts",
    router: receiptsRouter,
    tag: "Receipts",
  },
  {
    path: "/subcontractors",
    router: subcontractorsRouter,
    tag: "Subcontractors",
  },
  {
    path: "/compliance",
    router: complianceRouter,
    tag: "Compliance",
  },
  {
    path: "/notifications",
    router: notificationsRouter,
    tag: "Notifications",
  },
  {
    path: "/audit-log",
    router: auditLogRouter,
    tag: "AuditLog",
  },
  {
    path: "/billing",
    router: billingRouter,
    tag: "Billing",
  },
  {
    path: "/integrations",
    router: integrationsRouter,
    tag: "Integrations",
  },
  {
    path: "/site-snaps",
    router: siteSnapsRouter,
    tag: "SiteSnaps",
  },
  {
    path: "/change-orders",
    router: changeOrdersRouter,
    tag: "ChangeOrders",
  },
  {
    path: "/budgets",
    router: budgetsRouter,
    tag: "Budgets",
  },
  {
    path: "/smartmail",
    router: smartMailRouter,
    tag: "SmartMail",
  },
  {
    path: "/command-center",
    router: commandCenterRouter,
    tag: "CommandCenter",
  },
  {
    path: "/auth/oauth",
    router: oauthRouter,
    tag: "OAuth",
  },
  {
    path: "/storage",
    router: storageRouter,
    tag: "Storage",
  },
  {
    path: "/subconnect",
    router: subconnectRouter,
    tag: "Subconnect",
  },
];

const openApiDocument = buildOpenApiDocument({
  title: "Foreman API",
  version: "1.0.0",
  description:
    "Live API contract generated from mounted routes and Zod validators.",
  mounts: openApiRouterMounts,
});

app.use(requestId);
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(
  pinoHttp({
    logger,
    quietReqLogger: true,
    autoLogging: {
      ignore: (request) =>
        request.url === "/health" || request.url === "/health/ready",
    },
    customLogLevel: (_request, response, error) => {
      if (error || response.statusCode >= 500) {
        return "error";
      }

      if (response.statusCode >= 400) {
        return "warn";
      }

      return "info";
    },
    customSuccessMessage: (request, response) =>
      `${request.method} ${request.originalUrl ?? request.url} -> ${response.statusCode}`,
    customErrorMessage: (request, response, error) =>
      `${request.method} ${request.originalUrl ?? request.url} -> ${response.statusCode} (${error.message})`,
    serializers: {
      req: (request) => {
        const requestIdHeader = request.headers["x-request-id"];

        return {
          id: Array.isArray(requestIdHeader)
            ? requestIdHeader[0]
            : requestIdHeader,
          method: request.method,
          url: request.originalUrl ?? request.url,
          remoteAddress: request.remoteAddress,
          userAgent: request.headers["user-agent"],
        };
      },
      res: (response) => ({
        statusCode: response.statusCode,
      }),
    },
    customAttributeKeys: {
      req: "request",
      res: "response",
      err: "error",
      responseTime: "durationMs",
    },
  }),
);
app.use("/auth", authLimiter, authRouter);

// Raw body for Stripe webhooks (before JSON parser)
app.use("/billing/webhook/stripe", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Apply standard rate limit to all API routes
app.use(standardLimiter);

app.use("/health", healthRouter);
app.use("/portal", portalRouter);
app.use("/activity-feed", activityFeedRouter);
app.use("/ai", aiLimiter, aiRouter);
app.use("/organizations", organizationsRouter);
app.use("/permissions", permissionsRouter);
app.use("/projects", projectsRouter);
app.use("/rfqs", rfqsRouter);
app.use("/purchase-orders", purchaseOrdersRouter);
app.use("/invoices", invoicesRouter);
app.use("/match-runs", matchRunsRouter);
app.use("/receipts", receiptsRouter);
app.use("/subcontractors", subcontractorsRouter);
app.use("/compliance", complianceRouter);
app.use("/notifications", notificationsRouter);
app.use("/audit-log", auditLogRouter);
app.use("/billing", billingLimiter, billingRouter);
app.use("/integrations", integrationsRouter);
app.use("/site-snaps", siteSnapsRouter);
app.use("/change-orders", changeOrdersRouter);
app.use("/budgets", budgetsRouter);
app.use("/smartmail", smartMailRouter);
app.use("/command-center", commandCenterRouter);
app.use("/auth/oauth", authLimiter, oauthRouter);
app.use("/storage", storageRouter);
app.use("/subconnect", subconnectRouter);

app.get("/openapi.json", (_request: Request, response: Response) => {
  response.json(openApiDocument);
});

app.get("/docs", (_request: Request, response: Response) => {
  response.type("html").send(renderOpenApiHtml("/openapi.json"));
});

app.get("/", (_request: Request, response: Response) => {
  response.json({ name: "Foreman API", status: "ok" });
});

app.use(errorHandler);
