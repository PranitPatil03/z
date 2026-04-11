"use client";

import { LoadingState } from "@/components/ui/loading-state";
import { useSessionStore } from "@/store/session-store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

export function PortalAuthGuard({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const portalToken = useSessionStore((state) => state.portalToken);
  const setAuthMode = useSessionStore((state) => state.setAuthMode);
  const persistApi = useSessionStore.persist;

  const [hasHydrated, setHasHydrated] = useState(
    persistApi?.hasHydrated?.() ?? false,
  );

  useEffect(() => {
    if (!persistApi) {
      setHasHydrated(true);
      return;
    }

    const unsubscribe = persistApi.onFinishHydration(() => {
      setHasHydrated(true);
    });

    setHasHydrated(persistApi.hasHydrated());

    return unsubscribe;
  }, [persistApi]);

  useEffect(() => {
    if (!hasHydrated || portalToken) {
      return;
    }

    const query = searchParams.toString();
    const nextPath = query.length > 0 ? `${pathname}?${query}` : pathname;
    router.replace(`/portal/login?next=${encodeURIComponent(nextPath)}`);
  }, [hasHydrated, pathname, portalToken, router, searchParams]);

  useEffect(() => {
    if (portalToken) {
      setAuthMode("portal");
    }
  }, [portalToken, setAuthMode]);

  if (!hasHydrated) {
    return <LoadingState title="Restoring portal session" rows={2} />;
  }

  if (!portalToken) {
    return null;
  }

  return <>{children}</>;
}
