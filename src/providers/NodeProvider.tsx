'use client';

import { useReactFlow } from '@xyflow/react';
import React, { createContext, useContext, useState } from 'react';
import { nanoid } from 'nanoid';
import { useSchema } from './SchemaProvider';
import { useVersion } from './VersionProvider';

type NodeContextType = {
    addNode: (data: any) => void;
    getSchema: (data: any) => void;
};

const NodeContext = createContext<NodeContextType | undefined>(undefined);

export const NodeProvider = ({ children }: { children: React.ReactNode }) => {

    const { addNodes, addEdges } = useReactFlow();
    const { schemaData, setSchemaData } = useSchema();
    const { version } = useVersion();


    const addNode = async ({ data, id = null, targetNode = null, type = "ConfigNode" }: { apiVersion: string; id: string | null, kind: string; targetNode: string | null; type: string }) => {
        if (schemaData[data.kind]) {
            addNodes({
                id: id || nanoid(),
                type,
                position: { x: 100, y: 100 },
                data: data,
            });
        } else {
            const generatedId = nanoid()
            const schema = await fetch(`/api/schema/load?version=${version}&schemas=${data.kind}&full=${type != "ConfigNode"}`)
                .then(res => res.json())
                .catch(console.error);

            if (!schema) return;

            let parsedSchema = JSON.parse(schema)
            if (type == "ObjectRefNode") parsedSchema = { [`${data.kind.toLowerCase()}.${data.objectRef}`]: parsedSchema[data.kind.toLowerCase()]["properties"][data.objectRef] }
            setSchemaData(prev => ({ ...prev, ...parsedSchema }));

            addNodes({
                id: id || generatedId,
                type,
                position: { x: type == "ObjectRefNode" ? -500 : 100, y: 100 },
                data: data,
            });

            if (type == "ObjectRefNode") {
                addEdges({
                    "source": generatedId,
                    "sourceHandle": `source-${generatedId}`,
                    "target": targetNode || "",
                    "targetHandle": `target-${data.objectRef}`,
                    "id": `xy-edge__${generatedId}source-${generatedId}-${targetNode}target-${data.objectRef}`
                })
            }
        }
    };

    const getSchema = async ({ schemas, v }: { schemas: string[], v: string | null }) => {
        const versionToUse = v || version;

        // Split schemas into base (no dot) and nested (has dot)
        const baseSchemas = schemas.filter(s => !s.includes("."));
        const nestedSchemas = schemas.filter(s => s.includes("."));

        // 1. Fetch base schemas with full=false
        if (baseSchemas.length > 0) {
            try {
                const res = await fetch(
                    `/api/schema/load?version=${versionToUse}&schemas=${baseSchemas.join(",")}&full=false`
                );
                const raw = await res.json();
                const parsed = JSON.parse(raw);
                setSchemaData(prev => ({ ...prev, ...parsed }));
            } catch (err) {
                console.error("Base schema fetch failed:", err);
            }
        }

        // 2. Fetch nested schemas with full=true
        for (const item of nestedSchemas) {
            const [kind, property] = item.split(".");

            try {
                const res = await fetch(
                    `/api/schema/load?version=${versionToUse}&schemas=${kind}&full=true`
                );
                const raw = await res.json();
                const parsed = JSON.parse(raw);

                const key = `${kind.toLowerCase()}.${property}`;
                const schemaSubset =
                    parsed?.[kind.toLowerCase()]?.properties?.[property];

                if (schemaSubset) {
                    setSchemaData(prev => ({
                        ...prev,
                        [key]: schemaSubset,
                    }));
                }
            } catch (err) {
                console.error(`Nested schema fetch failed for ${item}:`, err);
            }
        }

        return true;
    };



    return (
        <NodeContext.Provider value={{
            addNode,
            getSchema
        }}>
            {children}
        </NodeContext.Provider>
    );
};

export const useNodeProvider = () => {
    const context = useContext(NodeContext);
    if (!context) {
        throw new Error('Not being used within context provider');
    }
    return context;
};
