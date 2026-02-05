'use client';

import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DemoModeProvider } from '@/contexts/DemoModeContext';
import { WarningProvider } from '@/providers/WarningsProvider';
import { VersionProvider } from '@/providers/VersionProvider';
import { SchemaProvider } from '@/providers/SchemaProvider';
import { SWRProvider } from '@/providers/SWRProvider';
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
