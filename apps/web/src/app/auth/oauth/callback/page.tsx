import { LoadingState } from "@/components/ui/loading-state";
import { OAuthCallbackPage } from "@/features/smartmail/pages/oauth-callback-page";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState title="Processing OAuth callback" rows={2} />}>
      <OAuthCallbackPage />
    </Suspense>
  );
}
