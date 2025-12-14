"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalApi } from "@/lib/api/modules/portal-api";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function PortalForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<{
    resetToken?: string;
    expiresAt?: string;
  } | null>(null);

  const requestMutation = useMutation({
    mutationFn: () => portalApi.requestPasswordReset({ email: email.trim() }),
    onSuccess: (result) => {
      setSent({
        resetToken: result.resetToken,
        expiresAt: result.expiresAt,
      });
      toast.success("If your account exists, a reset link has been issued.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to request password reset");
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm">
        {sent ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Reset issued
            </h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, a reset link
              was generated.
            </p>
            {sent.resetToken ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-left text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Dev reset token</p>
                <p className="break-all">{sent.resetToken}</p>
                {sent.expiresAt && <p>Expires: {sent.expiresAt}</p>}
              </div>
            ) : null}
            <Link
              href="/portal/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold text-foreground">
                Forgot portal password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your account email and we will issue a password reset
                token.
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                requestMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="portal-forgot-password-email">Email</Label>
                <Input
                  id="portal-forgot-password-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="portal@subcontractor.com"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={requestMutation.isPending}
              >
                {requestMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Request reset
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/portal/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
