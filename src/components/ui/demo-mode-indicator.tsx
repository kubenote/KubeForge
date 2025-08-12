'use client';

import { useDemoMode } from '@/contexts/DemoModeContext';

export function DemoModeIndicator() {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-blue-500 text-white text-xs font-regular py-1 px-4 text-center cursor-default">
        Demo Mode
      </div>
    </div>
  );
}