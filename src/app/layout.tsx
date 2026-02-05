import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { KubeForgeProviders } from "@/providers/kubeforge.providers";
import { DemoModeIndicator } from "@/components/ui/demo-mode-indicator";
import { isDemoModeEnabled } from "@/lib/demoMode";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
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
  const demoMode = isDemoModeEnabled();

  return (
    <html lang="en">

      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <KubeForgeProviders isDemoMode={demoMode}>
          {children}
          <DemoModeIndicator />
        </KubeForgeProviders>
      </body>
    </html>
  );
}
