import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VersionProvider } from "components/providers/VersionProvider";
import { WarningProvider } from "components/providers/WarningsProvider";
import { SchemaProvider } from "components/providers/SchemaProvider";
import { NodeProvider } from "components/providers/NodeProvider";
import { ReactFlowProvider } from "@xyflow/react";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { DemoModeIndicator } from "@/components/ui/demo-mode-indicator";
import { isDemoModeEnabled } from "@/lib/demoMode";

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
      </body>
    </html>
  );
}
