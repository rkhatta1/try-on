import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sneaker Try-On",
  description: "Visualize sneakers from a person photo and shoe reference.",
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
