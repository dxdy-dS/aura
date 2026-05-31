import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cuaca — Prakiraan Cuaca & Webcam Langsung",
  description:
    "Aplikasi cuaca real-time dengan prakiraan per jam, 7 hari, peta cuaca interaktif Windy, dan webcam langsung. Dibuat dengan Next.js 16 dan Windy API.",
  keywords: [
    "cuaca",
    "prakiraan",
    "weather",
    "forecast",
    "webcam",
    "Indonesia",
    "Windy",
    "Windy API",
    "Next.js",
  ],
  authors: [{ name: "d(x)d(y)" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Cuaca — Prakiraan Cuaca & Webcam Langsung",
    description:
      "Aplikasi cuaca Indonesia dengan data real-time dari Open-Meteo dan peta interaktif dari Windy.com",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
