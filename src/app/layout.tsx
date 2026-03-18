import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/navigation/app-nav";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "GAVIN // Productivity Terminal",
  description: "AI-powered task management terminal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.variable} antialiased bg-bg-primary text-text-primary overflow-hidden`}>
        <div className="flex h-screen flex-col overflow-hidden">
          <AppNav />
          <main className="flex flex-col flex-1 min-h-0 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
