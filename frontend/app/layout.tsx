import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";
import ContextProvider from "@/context";
import { headers } from "next/headers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus Intent Explorer",
  description:
    "Explore intents across the Nexus ecosystem - CORAL, FOLLY, and CERISE networks",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ContextProvider cookies={cookies}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ContextProvider>
      </body>
    </html>
  );
}
