import { ModulePage } from "@/features/app/pages/module-page";

interface ModuleRoutePageProps {
  params:
    | {
        moduleKey: string;
      }
    | Promise<{
        moduleKey: string;
      }>;
}

export default async function ModuleRoutePage({
  params,
}: ModuleRoutePageProps) {
  const resolvedParams = await params;
  return (
    <ModulePage moduleKey={decodeURIComponent(resolvedParams.moduleKey)} />
  );
}
