import { ChangeOrderDetailPage } from "@/features/change-orders/pages/change-order-detail-page";

interface PageProps {
  params: {
    changeOrderId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <ChangeOrderDetailPage changeOrderId={params.changeOrderId} />;
}
