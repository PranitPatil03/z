"use client";

import { AnvilLogo } from "@/components/branding/anvil-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message ?? "Something went wrong");
        return;
      }

      setSent(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";

      toast.error(
        message.includes("Failed to fetch")
          ? "Unable to reach the API. Verify local services and try again."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <Link href="/" className="mb-6 inline-flex items-center gap-2">
        <AnvilLogo showWordmark={false} iconClassName="h-9 w-9 rounded-xl" />
        <span className="text-lg font-semibold tracking-tight text-gray-900">
          anvil
        </span>
      </Link>

      {sent ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <CheckCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Check your email</h2>
            <p className="mt-1 text-sm text-gray-500">
              We sent a reset link to <strong>{email}</strong>
            </p>
          </div>
          <Link
            href="/login"
            className="mt-2 flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-gray-900">
              Reset password
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                suppressHydrationWarning
                className="h-12 rounded-xl border-gray-200 bg-white px-4 text-sm placeholder:text-gray-400 focus-visible:ring-blue-400/30"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              suppressHydrationWarning
              className="h-12 w-full rounded-sm bg-gray-900 text-white transition-colors hover:bg-gray-800"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
