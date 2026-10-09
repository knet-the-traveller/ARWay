import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARWay",
  description: "AR walking navigation prototype",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ARWay",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

import PhoneFrame from "@/components/PhoneFrame";
import PwaRegister from "@/components/PwaRegister";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="m-0 p-0 bg-neutral-950">
        <PwaRegister />
        <PhoneFrame>
          {children}
        </PhoneFrame>
      </body>
    </html>
  );
}
