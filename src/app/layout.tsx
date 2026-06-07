import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChainPulse Agent",
  description: "AI blockchain intelligence operations console"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
