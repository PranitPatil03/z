import { PortalPayApplicationDetailPage } from "@/features/portal/pages/portal-pay-application-detail-page";

interface PageProps {
  params: {
    payApplicationId: string;
  };
}

export default function Page({ params }: PageProps) {
  return (
    <PortalPayApplicationDetailPage
      payApplicationId={params.payApplicationId}
    />
  );
}
