import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blazly - Social Media Automation",
  description:
    "Create and schedule posts across LinkedIn, Facebook, Twitter, Threads, Reddit, and Instagram from one place.",
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
