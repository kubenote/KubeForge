'use client';

import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DemoModeProvider } from '@/contexts/DemoModeContext';
import { WarningProvider } from '@/providers/WarningsProvider';
import { ReactFlowProvider } from '@xyflow/react';
import { VersionProvider } from '@/providers/VersionProvider';
import { SchemaProvider } from '@/providers/SchemaProvider';
import { NodeProvider } from '@/providers/NodeProvider';

interface KubeForgeProvidersProps {
  children: React.ReactNode;
  isDemoMode?: boolean;
}

export function KubeForgeProviders({ children, isDemoMode = false }: KubeForgeProvidersProps) {
  return (
    <ThemeProvider>
      <DemoModeProvider isDemoMode={isDemoMode}>
        <WarningProvider>
          <ReactFlowProvider>
            <VersionProvider>
              <SchemaProvider>
                <NodeProvider>
                  {children}
                </NodeProvider>
              </SchemaProvider>
            </VersionProvider>
          </ReactFlowProvider>
        </WarningProvider>
      </DemoModeProvider>
    </ThemeProvider>
  );
}
