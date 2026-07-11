import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recipes Are For Sharing",
  description: "Preserve a family recipe and the memory behind it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
