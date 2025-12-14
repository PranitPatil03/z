"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organizationsApi } from "@/lib/api/modules/organizations-api";
import { authClient } from "@/lib/auth-client";
import { LayoutDashboard, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DEFAULT_NEXT_PATH = "/app";

function resolveNextPath(nextPath: string | null) {
  if (!nextPath) {
    return DEFAULT_NEXT_PATH;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }

  return nextPath;
}

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState(DEFAULT_NEXT_PATH);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    setNextPath(resolveNextPath(next));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

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
      }
    } catch {
      // Session bootstrap will retry activation when app shell mounts.
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Foreman</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
