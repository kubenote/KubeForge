import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VersionProvider } from "@/providers/VersionProvider";
import { WarningProvider } from "@/providers/WarningsProvider";
import { SchemaProvider } from "@/providers/SchemaProvider";
import { NodeProvider } from "@/providers/NodeProvider";
import { ReactFlowProvider } from "@xyflow/react";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { DemoModeIndicator } from "@/components/ui/demo-mode-indicator";
import { isDemoModeEnabled } from "@/lib/demoMode";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
  const demoMode = isDemoModeEnabled();

  return (
    <html lang="en">

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <DemoModeProvider isDemoMode={demoMode}>
            <WarningProvider>
              <ReactFlowProvider>
                <VersionProvider>
                  <SchemaProvider>
                    <NodeProvider>
                      {children}
                      <DemoModeIndicator />
                    </NodeProvider>
                  </SchemaProvider>
                </VersionProvider>
              </ReactFlowProvider>
            </WarningProvider>
          </DemoModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
