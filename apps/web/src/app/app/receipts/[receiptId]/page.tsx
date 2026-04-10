import { ReceiptDetailPage } from "@/features/procurement/pages/receipt-detail-page";

interface PageProps {
  params: {
    receiptId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <ReceiptDetailPage receiptId={params.receiptId} />;
}
