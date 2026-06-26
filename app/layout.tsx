import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RUN 213",
  description: "Built for runners. Made in Algeria.",
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
