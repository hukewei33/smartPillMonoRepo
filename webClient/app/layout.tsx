import type { Metadata } from "next";
import { SessionProvider } from "@/lib/SessionContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartPill",
  description: "SmartPill",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
