"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalApi } from "@/lib/api/modules/portal-api";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function PortalRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    trade: "",
    projectCode: "",
    password: "",
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      portalApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        trade: form.trade.trim(),
        projectCode: form.projectCode.trim(),
        password: form.password,
      }),
    onSuccess: (result) => {
      toast.success(result.message || "Registration complete. Please sign in.");
      router.replace(
        `/portal/login?email=${encodeURIComponent(form.email.trim())}`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to register portal account");
    },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Create portal account
          </h1>
          <p className="text-sm text-muted-foreground">
            Register your subcontractor account using the project code from your
            GC.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            registerMutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="portal-register-name">Name</Label>
              <Input
                id="portal-register-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                placeholder="Field Operations LLC"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="portal-register-trade">Trade</Label>
              <Input
                id="portal-register-trade"
                value={form.trade}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    trade: event.target.value,
                  }))
                }
                required
                placeholder="Electrical"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-register-email">Email</Label>
            <Input
              id="portal-register-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              required
              placeholder="portal@subcontractor.com"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="portal-register-phone">Phone (optional)</Label>
              <Input
                id="portal-register-phone"
                type="tel"
                autoComplete="tel"
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

            <div className="space-y-1.5">
              <Label htmlFor="portal-register-project-code">Project code</Label>
              <Input
                id="portal-register-project-code"
                value={form.projectCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    projectCode: event.target.value,
                  }))
                }
                required
                placeholder="PROJECT-001"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-register-password">Password</Label>
            <Input
              id="portal-register-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
              minLength={8}
              placeholder="Minimum 8 characters"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Register
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
