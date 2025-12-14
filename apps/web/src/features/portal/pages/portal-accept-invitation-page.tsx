"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalApi } from "@/lib/api/modules/portal-api";
import { setPortalSession } from "@/lib/auth/portal-session";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function PortalAcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    token: "",
    name: "",
    phone: "",
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

  const acceptMutation = useMutation({
    mutationFn: () => {
      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      return portalApi.acceptInvitation({
        token: form.token.trim(),
        password: form.password,
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      setPortalSession(result.token);
      toast.success("Invitation accepted. Welcome to SubConnect portal.");
      router.replace("/portal/overview");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to accept invitation");
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MailCheck className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Accept portal invitation
          </h1>
          <p className="text-sm text-muted-foreground">
            Activate your account and set your portal password.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            acceptMutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="portal-invite-token">Invitation token</Label>
            <Input
              id="portal-invite-token"
              value={form.token}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  token: event.target.value,
                }))
              }
              required
              placeholder="Paste invitation token"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="portal-invite-name">Name (optional)</Label>
              <Input
                id="portal-invite-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Company name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="portal-invite-phone">Phone (optional)</Label>
              <Input
                id="portal-invite-phone"
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-invite-password">Password</Label>
            <Input
              id="portal-invite-password"
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
            <Label htmlFor="portal-invite-confirm-password">
              Confirm password
            </Label>
            <Input
              id="portal-invite-confirm-password"
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
              placeholder="Re-enter password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Accept invitation
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm">
          <Link
            href="/portal/login"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
