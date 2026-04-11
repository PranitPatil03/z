"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { portalApi } from "@/lib/api/modules/portal-api";
import { setPortalSession } from "@/lib/auth/portal-session";
import { useSessionStore } from "@/store/session-store";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const DEFAULT_NEXT = "/portal/overview";

function resolveNextPath(nextValue: string | null) {
  if (!nextValue || !nextValue.startsWith("/portal")) {
    return DEFAULT_NEXT;
  }

  return nextValue;
}

function PortalLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalToken = useSessionStore((state) => state.portalToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const nextPath = useMemo(
    () => resolveNextPath(searchParams.get("next")),
    [searchParams],
  );
  const sessionExpired = searchParams.get("reason") === "expired";

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (!emailParam) {
      return;
    }

    setEmail(emailParam);
  }, [searchParams]);

  useEffect(() => {
    if (portalToken) {
      router.replace(nextPath);
    }
  }, [nextPath, portalToken, router]);

  const loginMutation = useMutation({
    mutationFn: () => portalApi.login({ email, password }),
    onSuccess: (result) => {
      setPortalSession(result.token);
      toast.success(`Welcome back, ${result.subcontractor.name}`);
      router.replace(nextPath);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Portal login failed");
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Subcontractor Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to submit compliance, pay applications, and daily logs.
          </p>
          {sessionExpired ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-700">
              Your session expired. Please sign in again.
            </p>
          ) : null}
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            loginMutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="portal-email">Email</Label>
            <Input
              id="portal-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="portal@subcontractor.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-password">Password</Label>
            <Input
              id="portal-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
            <div className="pt-1 text-right">
              <Link
                href="/portal/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign in
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link
            href="/portal/register"
            className="text-primary hover:underline"
          >
            Register
          </Link>{" "}
          or{" "}
          <Link
            href="/portal/invitations/accept"
            className="text-primary hover:underline"
          >
            accept invitation
          </Link>
          .
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to main site
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<LoadingState title="Loading portal" rows={2} />}>
      <PortalLoginPageContent />
    </Suspense>
  );
}
