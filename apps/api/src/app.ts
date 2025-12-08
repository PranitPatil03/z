import cors from "cors";
import express, { type Express, type Request, type Response, type Router } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import {
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
  organizationsRouter,
  oauthRouter,
  projectsRouter,
  purchaseOrdersRouter,
  receiptsRouter,
  rfqsRouter,
  siteSnapsRouter,
  smartMailRouter,
  subcontractorsRouter,
  portalRouter,
  activityFeedRouter,
} from "./routes";
import { healthRouter } from "./routes/health";
import { errorHandler } from "./middleware/error-handler";
import { env } from "./config/env";

export const app: Express = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(pinoHttp());
app.use("/auth", authRouter);

// Raw body for Stripe webhooks
app.use("/billing/webhook/stripe", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/health", healthRouter);
app.use("/portal", portalRouter);
app.use("/activity-feed", activityFeedRouter);
app.use("/ai", aiRouter);
app.use("/organizations", organizationsRouter);
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
app.use("/billing", billingRouter);
app.use("/integrations", integrationsRouter);
app.use("/site-snaps", siteSnapsRouter);
app.use("/change-orders", changeOrdersRouter);
app.use("/budgets", budgetsRouter);
app.use("/smartmail", smartMailRouter);
app.use("/command-center", commandCenterRouter);
app.use("/auth/oauth", oauthRouter);

app.get("/", (_request: Request, response: Response) => {
  response.json({ name: "Foreman API", status: "ok" });
});

app.use(errorHandler);
