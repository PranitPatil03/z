"use client";

import { AnvilLogo } from "@/components/branding/anvil-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/app/organization-setup",
    });

    if (error) {
      toast.error(error.message ?? "Could not create account");
      setLoading(false);
      return;
    }

    toast.success("Account created. Set up your organization to continue.");
    router.push("/app/organization-setup");
    router.refresh();
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app/organization-setup",
    });

    if (error) {
      toast.error(error.message ?? "Google sign-up is not available");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/80 p-8 backdrop-blur-sm">
      <Link href="/" className="mb-6 inline-flex">
        <AnvilLogo wordmarkClassName="text-slate-900" />
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-medium text-slate-900">Create an account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign up to start your workspace.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl border-slate-300 bg-white/80 text-slate-800 hover:bg-white"
        onClick={handleGoogleSignUp}
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

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-slate-700">
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm placeholder:text-slate-400 focus-visible:ring-blue-400/40"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-700">
            Work email
          </Label>
          <Input
            id="email"
            type="email"
            className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm placeholder:text-slate-400 focus-visible:ring-blue-400/40"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-slate-700">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm placeholder:text-slate-400 focus-visible:ring-blue-400/40"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl border border-blue-600 bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.01] hover:shadow-[0_6px_20px_rgba(37,99,235,0.55)] disabled:hover:scale-100"
          disabled={loading || googleLoading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-slate-900 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
