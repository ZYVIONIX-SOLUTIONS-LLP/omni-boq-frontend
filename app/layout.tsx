import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omni BOQ",
  description: "Omni BOQ Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans text-foreground">{children}</body>
    </html>
  );
}
