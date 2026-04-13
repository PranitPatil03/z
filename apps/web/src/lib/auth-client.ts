import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "./env";

/**
 * Better Auth React client — use this for ALL auth operations.
 *
 * baseURL: the API server root (not the auth path)
 * basePath: must match the backend's `basePath` in auth.ts ("/auth")
 *
 * Without basePath, the client defaults to "/api/auth" which would 404.
 */
const client = createAuthClient({
  baseURL: env.API_BASE_URL,
  basePath: "/auth",
  plugins: [organizationClient()],
  fetchOptions: {
    credentials: "include",
  },
});

export const authClient: ReturnType<typeof createAuthClient> = client;
