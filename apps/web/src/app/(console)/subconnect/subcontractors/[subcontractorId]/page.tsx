import { SubconnectPage } from "@/features/subconnect/pages/subconnect-page";

interface PageProps {
  params: {
    subcontractorId: string;
  };
}

export default function Page({ params }: PageProps) {
  return (
    <SubconnectPage
      defaultWorkspaceMode="onboarding"
      lockWorkspaceMode
      lifecycleOnly
      lockInvitationScopeToSelected
      initialSelectedSubcontractorId={params.subcontractorId}
    />
  );
}
