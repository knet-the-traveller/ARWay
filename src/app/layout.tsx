import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import PhoneFrame from "@/components/PhoneFrame";

const dmSerif = DM_Serif_Display({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARWay",
  description: "AR walking navigation prototype",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmSans.variable} antialiased`}
    >
      <body className="m-0 p-0">
        <PhoneFrame>
          {children}
        </PhoneFrame>
      </body>
    </html>
  );
}

