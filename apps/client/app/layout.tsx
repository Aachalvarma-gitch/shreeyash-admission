import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { ReduxProvider } from "@/components/providers/ReduxProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shreeyash Pratishthan",
  description: "Quality education that transforms young minds into skilled professionals",
  icons: { icon: "/favicon.webp" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "273422759843-hq1qecvou30prd0cqr4s8m0pd5mtn5ia.apps.googleusercontent.com";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <ReduxProvider>
            <ThemeProvider>
              <ReactQueryProvider>
                <ToastProvider>{children}</ToastProvider>
              </ReactQueryProvider>
            </ThemeProvider>
          </ReduxProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
