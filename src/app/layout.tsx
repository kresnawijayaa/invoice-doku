import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invoice DOKU",
  description: "Invoice management with DOKU payment gateway"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
