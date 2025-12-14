import { ChangeOrderDetailPage } from "@/features/change-orders/pages/change-order-detail-page";

interface PageProps {
  params: Promise<{
    changeOrderId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { changeOrderId } = await params;

  return <ChangeOrderDetailPage changeOrderId={changeOrderId} />;
}
