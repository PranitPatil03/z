import { createDb } from "@foreman/db";
import { env } from "./config/env";

export const db = createDb(env.DATABASE_URL);
