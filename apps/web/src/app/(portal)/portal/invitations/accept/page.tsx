import { LoadingState } from "@/components/ui/loading-state";
import { PortalAcceptInvitationPage } from "@/features/portal/pages/portal-accept-invitation-page";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState title="Loading invitation" rows={2} />}>
      <PortalAcceptInvitationPage />
    </Suspense>
  );
}
