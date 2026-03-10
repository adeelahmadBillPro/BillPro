import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BillPro - Billing & Invoice System",
  description: "Professional billing and invoice management system with Urdu/English support",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface min-h-screen">
        {children}
      </body>
    </html>
  );
}
