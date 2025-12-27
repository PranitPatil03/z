import { RfqDetailPage } from "@/features/procurement/pages/rfq-detail-page";

interface PageProps {
  params: Promise<{
    rfqId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { rfqId } = await params;

  return <RfqDetailPage rfqId={rfqId} />;
}
