import { AppProviders } from "@/app/providers/app-providers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { PropsWithChildren } from "react";
import "@/styles/globals.css";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "anvil",
  description: "AI-native construction operations workspace",
};

const themeBootstrapScript = `(() => {
  try {
    const storageKey = "anvil-theme";
    const storedTheme = window.localStorage.getItem(storageKey);
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveTheme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : systemDark
          ? "dark"
          : "light";

    const root = document.documentElement;
    root.classList.toggle("dark", effectiveTheme === "dark");
    root.style.colorScheme = effectiveTheme;
  } catch {
    // Ignore storage or media query access issues during bootstrap.
  }
})();`;

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootstrapScript,
          }}
        />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
