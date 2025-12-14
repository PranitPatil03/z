import { InvoiceDetailPage } from "@/features/procurement/pages/invoice-detail-page";

interface PageProps {
  params: Promise<{
    invoiceId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { invoiceId } = await params;

  return <InvoiceDetailPage invoiceId={invoiceId} />;
}
