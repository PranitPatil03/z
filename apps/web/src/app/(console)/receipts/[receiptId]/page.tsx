import { ReceiptDetailPage } from "@/features/procurement/pages/receipt-detail-page";

interface PageProps {
  params: Promise<{
    receiptId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { receiptId } = await params;

  return <ReceiptDetailPage receiptId={receiptId} />;
}
