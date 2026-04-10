import { PurchaseOrderDetailPage } from "@/features/procurement/pages/purchase-order-detail-page";

interface PageProps {
  params: {
    purchaseOrderId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <PurchaseOrderDetailPage purchaseOrderId={params.purchaseOrderId} />;
}
