"use client";

import { organizationsApi } from "@/lib/api/modules/organizations-api";
import { authClient } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type SessionWithActiveOrganization = {
  activeOrganizationId?: string;
};

export function SessionBootstrap() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data } = authClient.useSession();
  const portalToken = useSessionStore((state) => state.portalToken);
  const storedActiveOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );
  const setAuthMode = useSessionStore((state) => state.setAuthMode);
  const setActiveOrganizationId = useSessionStore(
    (state) => state.setActiveOrganizationId,
  );
  const autoActivationAttemptedRef = useRef(false);

  const activeOrganizationId =
    data?.session && "activeOrganizationId" in data.session
      ? ((data.session as SessionWithActiveOrganization).activeOrganizationId ??
        null)
      : null;

  const nextAuthMode =
    pathname.startsWith("/portal") && portalToken ? "portal" : "internal";

  useEffect(() => {
    setAuthMode(nextAuthMode);
    if (!data?.user) {
      setActiveOrganizationId(null);
      return;
    }

    if (activeOrganizationId) {
      setActiveOrganizationId(activeOrganizationId);
    }
  }, [
    data?.user,
    activeOrganizationId,
    nextAuthMode,
    setActiveOrganizationId,
    setAuthMode,
  ]);

  useEffect(() => {
    if (!data?.user) {
      autoActivationAttemptedRef.current = false;
      return;
    }

    if (
      nextAuthMode !== "internal" ||
      activeOrganizationId ||
      storedActiveOrganizationId
    ) {
      return;
    }

    if (autoActivationAttemptedRef.current) {
      return;
    }

    autoActivationAttemptedRef.current = true;
    let cancelled = false;

    const ensureActiveOrganization = async () => {
      try {
        const organizations = await organizationsApi.list();
        const fallbackOrganizationId = organizations[0]?.id;

        if (!fallbackOrganizationId) {
          return;
        }

        await organizationsApi.setActive(fallbackOrganizationId);
        if (cancelled) {
          return;
        }

        setActiveOrganizationId(fallbackOrganizationId);
        await queryClient.invalidateQueries();
      } catch {
        autoActivationAttemptedRef.current = false;
      }
    };

    void ensureActiveOrganization();

    return () => {
      cancelled = true;
    };
  }, [
    data?.user,
    activeOrganizationId,
    nextAuthMode,
    queryClient,
    setActiveOrganizationId,
    storedActiveOrganizationId,
  ]);

  return null;
}
