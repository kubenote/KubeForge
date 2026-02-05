'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import DefaultFlow from "../components/data/defaultFlow.json"
import { GVK, SchemaData, SchemaContextType, DefaultFlowData } from '@/types';
import { fetchGvks } from '@/lib/schema/schemaFetchService';

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

const defaultFlowData = DefaultFlow as DefaultFlowData;

export const SchemaProvider = ({ children }: { children: React.ReactNode }) => {
    const [schemaGvks, setSchemaGvks] = useState<GVK[]>([])
    const [schemaData, setSchemaData] = useState<SchemaData>(defaultFlowData.schemdaData || {})
    const loadedVersionRef = useRef<string | null>(null);

    const loadGvks = useCallback(async (version: string) => {
        // Skip if already loaded for this version
        if (loadedVersionRef.current === version) return;

        loadedVersionRef.current = version;
        const gvks = await fetchGvks(version);
        setSchemaGvks(gvks);
    }, []); // No dependencies - uses refs for state tracking

    return (
        <SchemaContext.Provider value={{
            schemaGvks,
            setSchemaGvks,
            schemaData,
            setSchemaData,
            loadGvks
        }}>
            {children}
        </SchemaContext.Provider>
    );
};

export const useSchema = () => {
    const context = useContext(SchemaContext);
    if (!context) {
        throw new Error('useSchema must be used within a SchemaProvider');
    }
    return context;
};
