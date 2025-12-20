import { AppShellLayout } from "@/app/layouts/app-shell-layout";
import type { PropsWithChildren } from "react";

export default function ConsoleLayout({ children }: PropsWithChildren) {
  return <AppShellLayout>{children}</AppShellLayout>;
}
