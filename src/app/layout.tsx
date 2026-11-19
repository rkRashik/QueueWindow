import type { Metadata } from "next";
import { Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const latin = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});
const bengali = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-bengali",
});

export const metadata: Metadata = {
  title: { default: "QueueWindow", template: "%s | QueueWindow" },
  description: "Manage your organization's service queue.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${latin.variable} ${bengali.variable}`}>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:p-3"
          href="#main"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
