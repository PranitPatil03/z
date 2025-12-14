import { LoadingState } from "@/components/ui/loading-state";
import { PortalResetPasswordPage } from "@/features/portal/pages/portal-reset-password-page";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState title="Loading reset form" rows={2} />}>
      <PortalResetPasswordPage />
    </Suspense>
  );
}
