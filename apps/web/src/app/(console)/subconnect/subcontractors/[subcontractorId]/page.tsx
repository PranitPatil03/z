import { SubcontractorDetailPage } from "@/features/subconnect/pages/subcontractor-detail-page";

interface PageProps {
  params: Promise<{
    subcontractorId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { subcontractorId } = await params;

  return <SubcontractorDetailPage subcontractorId={subcontractorId} />;
}
