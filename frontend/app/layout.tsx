import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TrackerProvider from "@/components/TrackerProvider";
import ScenarioBanner from "@/components/ScenarioBanner";
import ExitIntentModal from "@/components/ExitIntentModal";

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
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }} suppressHydrationWarning>
        <TrackerProvider>
          <Navbar />
          <ScenarioBanner />
          <ExitIntentModal />
          <main className="flex-1">{children}</main>
          <Footer />
        </TrackerProvider>
      </body>
    </html>
  );
}
