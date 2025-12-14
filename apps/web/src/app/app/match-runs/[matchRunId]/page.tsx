import { MatchRunDetailPage } from "@/features/procurement/pages/match-run-detail-page";

interface PageProps {
  params: Promise<{
    matchRunId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { matchRunId } = await params;

  return <MatchRunDetailPage matchRunId={matchRunId} />;
}
