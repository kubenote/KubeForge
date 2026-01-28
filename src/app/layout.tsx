import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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
