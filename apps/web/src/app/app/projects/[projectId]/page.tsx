import { ProjectDetailPage } from "@/features/workspace/pages/project-detail-page";

interface PageProps {
  params: {
    projectId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <ProjectDetailPage projectId={params.projectId} />;
}
