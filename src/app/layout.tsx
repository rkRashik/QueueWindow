import type { Metadata, Viewport } from "next";
import {
  Anek_Bangla,
  Atkinson_Hyperlegible_Next,
  Barlow_Semi_Condensed,
} from "next/font/google";
import "./globals.css";

const text = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-text",
});
const sign = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-sign-latin",
});
const bangla = Anek_Bangla({
  subsets: ["bengali"],
  display: "swap",
  axes: ["wdth"],
  preload: false,
  variable: "--font-bangla",
});

export const metadata: Metadata = {
  title: { default: "QueueWindow", template: "%s · QueueWindow" },
  description: "Service queues for desks, waiting rooms and phones.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${text.variable} ${sign.variable} ${bangla.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
