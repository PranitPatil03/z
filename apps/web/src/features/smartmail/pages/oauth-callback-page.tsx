"use client";

import { Button } from "@/components/ui/button";
import { type OAuthProvider, oauthApi } from "@/lib/api/modules/oauth-api";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function isOAuthProvider(value: string | null): value is OAuthProvider {
  return value === "gmail" || value === "outlook";
}

function getStoredProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem("smartmail.oauth.provider");
  return isOAuthProvider(value) ? value : null;
}

function getReturnPath() {
  if (typeof window === "undefined") {
    return "/smartmail";
  }

  const stored = window.sessionStorage.getItem("smartmail.oauth.returnPath");
  return stored?.startsWith("/") ? stored : "/smartmail";
}

function clearOAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem("smartmail.oauth.provider");
  window.sessionStorage.removeItem("smartmail.oauth.returnPath");
}

export function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flowStarted, setFlowStarted] = useState(false);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const providerParam = searchParams.get("provider");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  const resolvedProvider = useMemo(() => {
    if (isOAuthProvider(providerParam)) {
      return providerParam;
    }

    return getStoredProvider();
  }, [providerParam]);

  const callbackMutation = useMutation({
    mutationFn: () => {
      if (!code || !state) {
        throw new Error("Missing OAuth callback query parameters");
      }

      if (!resolvedProvider) {
        throw new Error("Unable to determine provider for OAuth callback");
      }

      return oauthApi.handleOAuthCallback({
        code,
        state,
        provider: resolvedProvider,
      });
    },
    onSuccess: () => {
      const path = getReturnPath();
      clearOAuthStorage();
      router.replace(`${path}?oauth=connected`);
    },
  });

  useEffect(() => {
    if (flowStarted || callbackMutation.isPending) {
      return;
    }

    if (oauthError) {
      return;
    }

    setFlowStarted(true);
    callbackMutation.mutate();
  }, [callbackMutation, flowStarted, oauthError]);

  const errorMessage =
    oauthErrorDescription ||
    callbackMutation.error?.message ||
    (oauthError ? `OAuth provider returned: ${oauthError}` : null);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4">
      <div className="w-full space-y-4 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">
          OAuth callback
        </h1>

        {callbackMutation.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Completing SmartMail {resolvedProvider ?? "provider"} connection...
          </div>
        ) : errorMessage ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/smartmail">Return to SmartMail</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFlowStarted(false);
                  callbackMutation.reset();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              SmartMail account connected. Redirecting...
            </p>
            <Button asChild>
              <Link href="/smartmail">Continue</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
