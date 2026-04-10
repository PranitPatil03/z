"use client";

import { QueryProvider } from "@/app/providers/query-provider";
import { SessionBootstrap } from "@/app/providers/session-bootstrap";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import type { PropsWithChildren } from "react";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SessionBootstrap />
        {children}
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  );
}
