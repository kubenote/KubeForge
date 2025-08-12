'use client';

import React, { createContext, useContext } from 'react';

interface DemoModeContextType {
  isDemoMode: boolean;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false
});

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  return context;
};

interface DemoModeProviderProps {
  children: React.ReactNode;
  isDemoMode: boolean;
}

export function DemoModeProvider({ children, isDemoMode }: DemoModeProviderProps) {
  return (
    <DemoModeContext.Provider value={{ isDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}