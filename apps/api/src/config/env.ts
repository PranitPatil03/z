import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: isProduction
    ? z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
    : z
        .string()
        .min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
        .optional(),
  BETTER_AUTH_URL: z.string().min(1).default("http://localhost:3001"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  JWT_SECRET: isProduction
    ? z.string().min(32, "JWT_SECRET is required in production (min 32 chars)")
    : z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters")
        .optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  ENCRYPTION_KEY: isProduction
    ? z
        .string()
        .min(32, "ENCRYPTION_KEY is required in production (min 32 chars)")
    : z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  REDIS_URL: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["aws-s3"]).optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PREFIX: z.string().optional(),
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  S3_MAX_UPLOAD_MB: z.coerce.number().int().positive().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["smtp", "resend"]).optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  OUTLOOK_CLIENT_ID: z.string().optional(),
  OUTLOOK_CLIENT_SECRET: z.string().optional(),
  OAUTH_REDIRECT_URI: z.string().optional(),
  SMARTMAIL_SYNC_LOOKBACK_MINUTES: z.coerce.number().int().min(0).optional(),
  SMARTMAIL_DEFAULT_SYNC_MAX_RESULTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
  SITE_SNAP_AI_PROVIDER: z
    .enum(["openai", "anthropic", "gemini", "azure-openai"])
    .optional(),
  SITE_SNAP_AI_MODEL: z.string().optional(),
  SITE_SNAP_MIN_IMAGE_BYTES: z.coerce.number().int().positive().optional(),
  SITE_SNAP_ALLOWED_IMAGE_TYPES: z.string().optional(),
  SITE_SNAP_SAFETY_ALERT_MIN_CONFIDENCE_BPS: z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .optional(),
  BUDGET_AI_PROVIDER: z
    .enum(["openai", "anthropic", "gemini", "azure-openai"])
    .optional(),
  BUDGET_AI_MODEL: z.string().optional(),
  BUDGET_DEFAULT_ALERT_THRESHOLD_BPS: z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .optional(),
  CHANGE_ORDER_APPROVAL_STAGES: z.string().optional(),
  CHANGE_ORDER_DEFAULT_STAGE_SLA_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  CHANGE_ORDER_STAGE_SLA_HOURS: z.string().optional(),
  PORTAL_ALLOW_PROJECT_CODE_REGISTRATION: z
    .union([
      z.boolean(),
      z.string().transform((value) => value.toLowerCase() === "true"),
    ])
    .optional(),
  SUBCONNECT_INVITATION_EXPIRY_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  PORTAL_PASSWORD_RESET_EXPIRY_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
});

export const env = envSchema.parse(process.env);
