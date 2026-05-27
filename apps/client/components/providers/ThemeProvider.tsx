"use client";

import { ClientThemeProvider } from "@wrksz/themes/client";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClientThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </ClientThemeProvider>
  );
}
