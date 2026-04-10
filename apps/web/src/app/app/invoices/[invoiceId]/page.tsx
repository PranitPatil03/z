import { InvoiceDetailPage } from "@/features/procurement/pages/invoice-detail-page";

interface PageProps {
  params: {
    invoiceId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <InvoiceDetailPage invoiceId={params.invoiceId} />;
}
