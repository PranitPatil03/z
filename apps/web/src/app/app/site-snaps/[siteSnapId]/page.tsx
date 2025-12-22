import { SiteSnapDetailPage } from "@/features/sitesnap/pages/site-snap-detail-page";

interface SiteSnapDetailRouteProps {
  params: Promise<{
    siteSnapId: string;
  }>;
}

export default async function SiteSnapDetailRoute({
  params,
}: SiteSnapDetailRouteProps) {
  const { siteSnapId } = await params;

  return <SiteSnapDetailPage siteSnapId={siteSnapId} />;
}
