import "@fontsource-variable/manrope";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "QueueWindow", template: "%s | QueueWindow" },
  description: "Manage your organization's service queue.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-10 focus:bg-white focus:p-3"
          href="#main"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
