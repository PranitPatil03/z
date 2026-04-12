"use client";

import { AnvilLogo } from "@/components/branding/anvil-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organizationsApi } from "@/lib/api/modules/organizations-api";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DEFAULT_NEXT_PATH = "/dashboard";

function resolveNextPath(nextPath: string | null) {
  if (!nextPath) {
    return DEFAULT_NEXT_PATH;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }

  return nextPath;
}

function buildAbsoluteCallbackUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState(DEFAULT_NEXT_PATH);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    setNextPath(resolveNextPath(next));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let destinationPath = nextPath;

    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: nextPath,
    });

    if (error) {
      toast.error(error.message ?? "Invalid credentials");
      setLoading(false);
      return;
    }

    try {
      const organizations = await organizationsApi.list();
      const fallbackOrganizationId = organizations[0]?.id;

      if (fallbackOrganizationId) {
        await organizationsApi.setActive(fallbackOrganizationId);
      } else {
        destinationPath = "/organization-setup";
      }
    } catch {
      // Session bootstrap will retry activation when app shell mounts.
      destinationPath = "/organization-setup";
    }

    router.push(destinationPath);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);

    const callbackURL = buildAbsoluteCallbackUrl(nextPath);
    const errorCallbackURL = buildAbsoluteCallbackUrl(
      `/login?next=${encodeURIComponent(nextPath)}`,
    );

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL,
    });

    if (error) {
      toast.error(error.message ?? "Google sign-in is not available");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="rounded-xl">
      <Link href="/" className="mb-6 inline-flex">
        <AnvilLogo wordmarkClassName="text-gray-900" />
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to your account to continue.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg aria-hidden="true" className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.28-2.1 3.56-5.2 3.56-8.66Z"
              fill="#4285F4"
            />
            <path
              d="M12 24c3.24 0 5.96-1.08 7.95-2.93l-3.88-3c-1.08.73-2.46 1.17-4.07 1.17-3.13 0-5.78-2.12-6.73-4.98H1.27v3.09A12 12 0 0 0 12 24Z"
              fill="#34A853"
            />
            <path
              d="M5.27 14.26A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.26V6.65H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.35l4-3.09Z"
              fill="#FBBC05"
            />
            <path
              d="M12 4.77c1.76 0 3.35.6 4.6 1.78l3.45-3.46C17.95 1.16 15.24 0 12 0A12 12 0 0 0 1.27 6.65l4 3.09c.95-2.86 3.6-4.97 6.73-4.97Z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-gray-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            className="h-12 rounded-xl border-gray-200 bg-white px-4 text-sm placeholder:text-gray-400 focus-visible:ring-blue-400/30"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-gray-700">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-gray-500 transition-colors hover:text-gray-900"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            className="h-12 rounded-xl border-gray-200 bg-white px-4 text-sm placeholder:text-gray-400 focus-visible:ring-blue-400/30"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-sm bg-gray-900 text-white transition-colors hover:bg-gray-800"
          disabled={loading || googleLoading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-gray-900 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
