'use client';

import React, { createContext, useContext, useState } from 'react';
import DefaultFlow from "../components/data/defaultFlow.json"
import { GVK, SchemaData, SchemaContextType, DefaultFlowData } from '@/types';

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

const defaultFlowData = DefaultFlow as DefaultFlowData;

export const SchemaProvider = ({ children }: { children: React.ReactNode }) => {
    const [schemaGvks, setSchemaGvks] = useState<GVK[]>([])
    const [schemaData, setSchemaData] = useState<SchemaData>(defaultFlowData.schemdaData || {})

    return (
        <SchemaContext.Provider value={{
            schemaGvks,
            setSchemaGvks,
            schemaData,
            setSchemaData
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
