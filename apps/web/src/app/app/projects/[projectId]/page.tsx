import { ProjectDetailPage } from "@/features/workspace/pages/project-detail-page";

interface PageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { projectId } = await params;

  return <ProjectDetailPage projectId={projectId} />;
}
