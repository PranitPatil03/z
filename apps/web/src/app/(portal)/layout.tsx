import type { PropsWithChildren } from "react";

export default function PortalLayout({ children }: PropsWithChildren) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
