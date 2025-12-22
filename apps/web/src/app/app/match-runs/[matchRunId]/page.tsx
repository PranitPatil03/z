import { MatchRunDetailPage } from "@/features/procurement/pages/match-run-detail-page";

interface PageProps {
  params: {
    matchRunId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <MatchRunDetailPage matchRunId={params.matchRunId} />;
}
