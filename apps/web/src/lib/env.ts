import { z } from "zod";

const envSchema = z.object({
  MODE: z.enum(["development", "test", "production"]),
  API_BASE_URL: z.string().url().default("http://localhost:3001"),
  ENABLE_OUTLOOK_OAUTH: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse({
  MODE: process.env.NODE_ENV ?? "development",
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
  ENABLE_OUTLOOK_OAUTH: process.env.NEXT_PUBLIC_ENABLE_OUTLOOK_OAUTH ?? "false",
});

if (!parsed.success) {
  throw new Error(`Invalid frontend environment: ${parsed.error.message}`);
}

export const env = parsed.data;
