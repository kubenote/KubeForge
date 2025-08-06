import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VersionProvider } from "components/providers/VersionProvider";
import { WarningProvider } from "components/providers/WarningsProvider";
import { SchemaProvider } from "components/providers/SchemaProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KubeForge",
  description: "Generate kubernetes deployment files with ease",
  icons: "/images/helm.png"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WarningProvider>
          <VersionProvider>
            <SchemaProvider>
              {children}
            </SchemaProvider>
          </VersionProvider>
        </WarningProvider>
      </body>
    </html>
  );
}
