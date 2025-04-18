import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Providers from "@/providers/providers";
import { headers } from "next/headers";

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = headers().get("cookie");

  return (
    <html lang="it">
      <body className={`${montserrat.className} dark antialiased`}>
        <Providers cookie={cookie}>{children}</Providers>
      </body>
    </html>
  );
}
