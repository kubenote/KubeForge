'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as Overrides from "@/components/data/schema-overrides.json"
import get from 'lodash/get';
import set from 'lodash/set';
import has from 'lodash/has';
import merge from 'lodash/merge';
import { SchemaData, VersionContextType } from '@/types';
import { projectUrls } from '@/lib/apiUrls';

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export const VersionProvider = ({ children }: { children: React.ReactNode }) => {
  const [version, setVersionState] = useState('');
  const [schemaData, setSchemaDataState] = useState<SchemaData>({});
  const [preRefSchemaData, setPreRefSchemaData] = useState<SchemaData>({});
  const projectIdRef = useRef<string | null>(null);

  const setVersion = useCallback((v: string) => {
    setVersionState(v);
    localStorage.setItem('preferredK8sVersion', v);
    // Persist to project if we have a projectId
    if (projectIdRef.current) {
      fetch(projectUrls.get(projectIdRef.current), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kubernetes_version: v }),
      }).catch(() => {});
    }
  }, []);

  const setProjectContext = useCallback((projectId: string | null, projectVersion: string | null) => {
    projectIdRef.current = projectId;
    if (projectVersion) {
      setVersionState(projectVersion);
    }
  }, []);

  const setSchemaData = (data: SchemaData) => {
    const newData = structuredClone(data);

    Object.entries(Overrides).forEach(([flatPath, overrideValue]) => {
      const pathArray = flatPath.split(".");

      if (has(newData, pathArray)) {
        const existingValue = get(newData, pathArray);
        const mergedValue = merge({}, existingValue, overrideValue);
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
    <VersionContext.Provider value={{ version, setVersion, schemaData, setSchemaData, preRefSchemaData, setPreRefSchemaData, setProjectContext }}>
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
