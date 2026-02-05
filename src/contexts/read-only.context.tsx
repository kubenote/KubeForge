'use client';

import React, { createContext, useContext } from 'react';

interface ReadOnlyContextType {
  isReadOnly: boolean;
}

const ReadOnlyContext = createContext<ReadOnlyContextType>({
  isReadOnly: false
});

export const useReadOnly = () => {
  const context = useContext(ReadOnlyContext);
  return context;
};

interface ReadOnlyProviderProps {
  children: React.ReactNode;
  isReadOnly: boolean;
}

export function ReadOnlyProvider({ children, isReadOnly }: ReadOnlyProviderProps) {
  return (
    <ReadOnlyContext.Provider value={{ isReadOnly }}>
      {children}
    </ReadOnlyContext.Provider>
  );
}