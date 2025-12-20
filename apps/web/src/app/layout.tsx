import { AppProviders } from "@/app/providers/app-providers";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Foreman",
  description: "Construction operations intelligence workspace",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
