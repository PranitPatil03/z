import { RfqDetailPage } from "@/features/procurement/pages/rfq-detail-page";

interface PageProps {
  params: {
    rfqId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <RfqDetailPage rfqId={params.rfqId} />;
}
