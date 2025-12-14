import { AppShellLayout } from "@/app/layouts/app-shell-layout";
import { ActiveOrganizationGate } from "@/components/auth/active-organization-gate";
import type { PropsWithChildren } from "react";

export default function ConsoleLayout({ children }: PropsWithChildren) {
  return (
    <AppShellLayout>
      <ActiveOrganizationGate>{children}</ActiveOrganizationGate>
    </AppShellLayout>
  );
}
