"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalApi } from "@/lib/api/modules/portal-api";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function PortalResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    token: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    if (!token) {
      return;
    }

    setForm((current) => ({ ...current, token }));
  }, [searchParams]);

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      return portalApi.confirmPasswordReset({
        token: form.token.trim(),
        password: form.password,
      });
    },
    onSuccess: () => {
      toast.success("Password updated. Sign in with your new password.");
      router.replace("/portal/login");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to reset password");
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Reset portal password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your reset token and choose a new password.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            confirmMutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="portal-reset-token">Reset token</Label>
            <Input
              id="portal-reset-token"
              value={form.token}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  token: event.target.value,
                }))
              }
              required
              placeholder="Paste reset token"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-reset-password">New password</Label>
            <Input
              id="portal-reset-password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              minLength={8}
              required
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-reset-confirm-password">
              Confirm password
            </Label>
            <Input
              id="portal-reset-confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              minLength={8}
              required
              placeholder="Re-enter new password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Reset password
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
      </div>
    </main>
  );
}
