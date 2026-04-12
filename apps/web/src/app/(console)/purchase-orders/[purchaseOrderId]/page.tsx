import { PurchaseOrderDetailPage } from "@/features/procurement/pages/purchase-order-detail-page";

interface PageProps {
  params: Promise<{
    purchaseOrderId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { purchaseOrderId } = await params;

  return <PurchaseOrderDetailPage purchaseOrderId={purchaseOrderId} />;
}
