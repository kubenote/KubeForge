'use client';

import React, { createContext, useContext, useState } from 'react';
import DefaultFlow from "../components/data/defaultFlow.json"
import { throwProviderError } from '@/lib/providerErrors';

type SchemaContextType = {
    schemaGvks: any;
    setSchemaGvks: (data: any) => void;
    schemaData: any;
    setSchemaData: (data: any) => void;
};

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

export const SchemaProvider = ({ children }: { children: React.ReactNode }) => {
    const [schemaGvks, setSchemaGvks] = useState([])
    const [schemaData, setSchemaData] = useState((DefaultFlow as any).schemdaData)

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
        throwProviderError('useSchema', 'SchemaProvider');
    }
    return context;
};
