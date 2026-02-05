'use client';

import React from 'react';
import { ThemeProvider } from '@/contexts/theme.context';
import { DemoModeProvider } from '@/contexts/demo-mode.context';
import { WarningProvider } from '@/providers/warnings.provider';
import { VersionProvider } from '@/providers/version.provider';
import { SchemaProvider } from '@/providers/schema.provider';
import { SWRProvider } from '@/providers/swr.provider';
import { Toaster } from '@/components/ui/sonner';

interface KubeForgeProvidersProps {
  children: React.ReactNode;
  isDemoMode?: boolean;
}

export function KubeForgeProviders({ children, isDemoMode = false }: KubeForgeProvidersProps) {
  return (
    <SWRProvider>
      <ThemeProvider>
        <DemoModeProvider isDemoMode={isDemoMode}>
          <WarningProvider>
            <VersionProvider>
              <SchemaProvider>
                {children}
                <Toaster />
              </SchemaProvider>
            </VersionProvider>
          </WarningProvider>
        </DemoModeProvider>
      </ThemeProvider>
    </SWRProvider>
  );
}
