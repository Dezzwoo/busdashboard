import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bus Control Dashboard",
  description: "Real-time passenger monitoring system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}