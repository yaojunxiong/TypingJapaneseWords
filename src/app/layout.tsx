import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Supabase Starter",
  description: "A Next.js project prepared for Supabase, Git, and Vercel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
