import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TrackerProvider from "@/components/TrackerProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Neural Store — Tech Gadgets Research Platform",
  description:
    "A simulated tech-gadget e-commerce platform for academic research on consumer behavior and sequential purchasing patterns.",
  keywords: ["e-commerce", "tech gadgets", "research", "consumer behavior"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <TrackerProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </TrackerProvider>
      </body>
    </html>
  );
}
