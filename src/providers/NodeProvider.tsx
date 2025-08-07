'use client';

import { useReactFlow } from '@xyflow/react';
import React, { createContext, useContext, useState } from 'react';
import { nanoid } from 'nanoid';
import { useSchema } from './SchemaProvider';
import { useVersion } from './VersionProvider';

type NodeContextType = {
    addNode: (data: any) => void;
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


    return (
        <NodeContext.Provider value={{
            addNode
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
