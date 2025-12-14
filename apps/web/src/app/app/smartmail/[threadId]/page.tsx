import { SmartMailThreadPage } from "@/features/smartmail/pages/smartmail-thread-page";

interface PageProps {
  params: {
    threadId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <SmartMailThreadPage threadId={params.threadId} />;
}
