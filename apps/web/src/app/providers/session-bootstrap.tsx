"use client";

import { authClient } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type SessionWithActiveOrganization = {
  activeOrganizationId?: string;
};

export function SessionBootstrap() {
  const pathname = usePathname();
  const { data } = authClient.useSession();
  const portalToken = useSessionStore((state) => state.portalToken);
  const setAuthMode = useSessionStore((state) => state.setAuthMode);
  const setActiveOrganizationId = useSessionStore(
    (state) => state.setActiveOrganizationId,
  );

  const activeOrganizationId =
    data?.session && "activeOrganizationId" in data.session
      ? ((data.session as SessionWithActiveOrganization).activeOrganizationId ??
        null)
      : null;

  const nextAuthMode =
    pathname.startsWith("/portal") && portalToken ? "portal" : "internal";

  useEffect(() => {
    setAuthMode(nextAuthMode);
    setActiveOrganizationId(activeOrganizationId);
  }, [
    activeOrganizationId,
    nextAuthMode,
    setActiveOrganizationId,
    setAuthMode,
  ]);

  return null;
}
