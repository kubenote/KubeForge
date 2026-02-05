'use client';

import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
