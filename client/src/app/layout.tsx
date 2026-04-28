"use client";

import { useAppEnv } from "@/hooks/useIsProduction";
import { useStopImpersonation } from "@/hooks/useStopImpersonation";
import QueryProvider from "@/providers/QueryProvider";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AuthenticationGuard } from "../components/AuthenticationGuard";
import { OrganizationInitializer } from "../components/OrganizationInitializer";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { cn } from "../lib/utils";
import "./globals.css";
import { ReactScan } from "./ReactScan";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use the hook to expose stopImpersonating globally
  useStopImpersonation();

  const appEnv = useAppEnv();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href={process.env.NEXT_PUBLIC_APP_FAVICON || "/favicon.ico"} />
      </head>
      <ReactScan />
      <NuqsAdapter>
        <body className={cn("bg-background text-foreground h-full", inter.className)} suppressHydrationWarning>
          <ThemeProvider attribute="class" enableSystem={true} disableTransitionOnChange>
            <TooltipProvider>
              <QueryProvider>
                <OrganizationInitializer />
                <AuthenticationGuard />
                {children}
              </QueryProvider>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </NuqsAdapter>
    </html>
  );
}
