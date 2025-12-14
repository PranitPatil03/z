"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { portalApi } from "@/lib/api/modules/portal-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";

export default function PortalProfilePage() {
  const profileQuery = useQuery({
    queryKey: queryKeys.portal.profile(),
    queryFn: () => portalApi.getProfile(),
  });

  if (profileQuery.isLoading) {
    return <LoadingState title="Loading profile" rows={3} />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ErrorState
        title="Unable to load portal profile"
        description="Please sign in again and retry."
        onRetry={() => {
          void profileQuery.refetch();
        }}
      />
    );
  }

  const profile = profileQuery.data.profile;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portal Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Name:</span>{" "}
            {profile.name}
          </p>
          <p>
            <span className="font-medium text-foreground">Email:</span>{" "}
            {profile.email}
          </p>
          <p>
            <span className="font-medium text-foreground">Organization:</span>{" "}
            {profile.organizationId}
          </p>
          <p>
            <span className="font-medium text-foreground">
              Subcontractor ID:
            </span>{" "}
            {profile.subcontractorId}
          </p>
          <p>
            <span className="font-medium text-foreground">Project ID:</span>{" "}
            {profile.projectId ?? "Not assigned"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
