import { PortalDailyLogDetailPage } from "@/features/portal/pages/portal-daily-log-detail-page";

interface PageProps {
  params: {
    dailyLogId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <PortalDailyLogDetailPage dailyLogId={params.dailyLogId} />;
}
