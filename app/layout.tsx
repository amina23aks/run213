import type { Metadata } from "next";
import { CartProvider } from "@/context/cart";
import { FavoritesProvider } from "@/context/favorites";
import "./globals.css";

export const metadata: Metadata = {
  title: "213 RUN",
  description: "BUILT. NOT FOUND.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><CartProvider><FavoritesProvider>{children}</FavoritesProvider></CartProvider></body>
    </html>
  );
}
