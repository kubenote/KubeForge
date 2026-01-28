'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Overrides from "@/components/data/schema-overrides.json"
import { get, set, has, merge } from "lodash";
import { SchemaData, VersionContextType } from '@/types';

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export const VersionProvider = ({ children }: { children: React.ReactNode }) => {
  const [version, setVersionState] = useState(''); // default empty
  const [schemaData, setSchemaDataState] = useState<SchemaData>({}); // default empty
  const [preRefSchemaData, setPreRefSchemaData] = useState<SchemaData>({}); // default empty

  const setVersion = (v: string) => {
    localStorage.setItem('preferredK8sVersion', v);
    setVersionState(v);
  };



  const setSchemaData = (data: SchemaData) => {
    const newData = structuredClone(data);

    Object.entries(Overrides).forEach(([flatPath, overrideValue]) => {
      const pathArray = flatPath.split(".");

      if (has(newData, pathArray)) {
        const existingValue = get(newData, pathArray);
        const mergedValue = merge({}, existingValue, overrideValue); // preserve original, apply override
        set(newData, pathArray, mergedValue);
      }
    });
    setSchemaDataState(newData);
  };



  useEffect(() => {
    const stored = localStorage.getItem('preferredK8sVersion');
    if (stored) setVersionState(stored);
  }, []);

  return (
    <VersionContext.Provider value={{ version, setVersion, schemaData, setSchemaData, preRefSchemaData, setPreRefSchemaData }}>
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = () => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};
