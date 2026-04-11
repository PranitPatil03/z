"use client";

import { LoadingState } from "@/components/ui/loading-state";
import { useSessionStore } from "@/store/session-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PortalHomePage() {
  const router = useRouter();
  const portalToken = useSessionStore((state) => state.portalToken);
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
    if (!hasHydrated) {
      return;
    }

    router.replace(portalToken ? "/portal/overview" : "/portal/login");
  }, [hasHydrated, portalToken, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-12">
      <LoadingState title="Preparing portal" rows={2} className="w-full" />
    </main>
  );
}
