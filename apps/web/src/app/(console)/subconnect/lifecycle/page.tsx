import { SubconnectPage } from "@/features/subconnect/pages/subconnect-page";

export default function Page() {
  return (
    <SubconnectPage
      defaultWorkspaceMode="onboarding"
      lockWorkspaceMode
      lifecycleOnly
    />
  );
}
