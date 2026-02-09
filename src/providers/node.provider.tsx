'use client';

import { useReactFlow } from '@xyflow/react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { useSchema } from './schema.provider';
import { useVersion } from './version.provider';
import { analytics } from '@/lib/analytics';
import { fetchSchemas } from '@/lib/schema/schemaFetchService';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { NodeContextType, AddNodeParams, GetSchemaParams, SchemaData } from '@/types';

const NodeContext = createContext<NodeContextType | undefined>(undefined);

export const NodeProvider = ({ children }: { children: React.ReactNode }) => {

    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState(0);

    const { addNodes, addEdges } = useReactFlow();
    const { schemaData, setSchemaData } = useSchema();
    const { version } = useVersion();

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (isLoading) {
            setProgress(0); // Reset progress at start
            interval = setInterval(() => {
                setProgress(prev => {
                    let next = prev;
                    if (prev < 80) {
                        next = prev + 2;
                    }
                    else if (prev >= 80 && prev < 93) {
                        next = prev + 0.5;
                    }
                    else if (prev >= 93) {
                        next = 0;
                    }
                    return next;
                });
            }, 200); // adjust speed here
        } else {
            // When loading finishes, ensure it fills to 100
            setProgress(100);
            setTimeout(() => setProgress(0), 500); // Optional: reset after complete
        }

        return () => clearInterval(interval);
    }, [isLoading]);


    const addNode = async ({ data, id = null, targetNode = null, type = "KindNode" }: AddNodeParams): Promise<void> => {
        setProgress(0)
        setIsLoading(true)

        const schemaKey = 'objectRef' in data ? `${data.kind.toLowerCase()}.${data.objectRef}` : data.kind.toLowerCase();
        if (schemaData[schemaKey]) {
            const generatedId = nanoid()

            addNodes({
                id: id || generatedId,
                type,
                position: { x: type == "ObjectRefNode" ? -500 : 100, y: 100 },
                data: { ...data, editing: true },
            });
            if (type === "ObjectRefNode" && targetNode && 'objectRef' in data && typeof data.objectRef === 'string') {
                addEdges({
                    "source": generatedId,
                    "sourceHandle": `source-${generatedId}`,
                    "target": targetNode,
                    "targetHandle": `target-${data.objectRef}`,
                    "id": `xy-edge__${generatedId}source-${generatedId}-${targetNode}target-${data.objectRef}`
                })
            }
        } else {
            const generatedId = nanoid()
            const schema = await fetchSchemas(version, [data.kind], type !== "KindNode");

            if (!schema) {
                setIsLoading(false);
                return;
            }

            let parsedSchema: SchemaData = schema as SchemaData;
            if (type === "ObjectRefNode" && 'objectRef' in data && typeof data.objectRef === 'string') {
                const kindSchema = parsedSchema[data.kind.toLowerCase()];
                if (kindSchema?.properties?.[data.objectRef]) {
                    parsedSchema = { 
                        [`${data.kind.toLowerCase()}.${data.objectRef}`]: kindSchema.properties[data.objectRef] 
                    };
                }
            }
            setSchemaData((prev: SchemaData) => ({ ...prev, ...parsedSchema }));

            addNodes({
                id: id || generatedId,
                type,
                position: { x: type == "ObjectRefNode" ? -500 : 100, y: 100 },
                data: { ...data, editing: true },
            });

            if (type === "ObjectRefNode" && targetNode && 'objectRef' in data && typeof data.objectRef === 'string') {
                addEdges({
                    "source": generatedId,
                    "sourceHandle": `source-${generatedId}`,
                    "target": targetNode,
                    "targetHandle": `target-${data.objectRef}`,
                    "id": `xy-edge__${generatedId}source-${generatedId}-${targetNode}target-${data.objectRef}`
                })
            }
        }

        setProgress(100);
        setTimeout(() => setIsLoading(false), 500); // smooth finish

        // Track node addition
        analytics.nodeAdded(type, data.kind);
    };

    const getSchema = async ({ schemas, v }: GetSchemaParams): Promise<boolean> => {
        setProgress(0)
        setIsLoading(true)

        const versionToUse = v || version;

        // Split schemas into base (no dot) and nested (has dot)
        const baseSchemas = schemas.filter(s => !s.includes("."));
        const nestedSchemas = schemas.filter(s => s.includes("."));

        // Get unique kinds needed for nested schemas (will need full=true)
        const nestedKinds = [...new Set(nestedSchemas.map(s => s.split(".")[0]))];

        // Combine all unique kinds: base schemas + nested kinds
        // Base schemas only need full=false, but nested need full=true
        // If a kind appears in both, we need full=true
        const allKinds = [...new Set([...baseSchemas, ...nestedKinds])];
        const kindsNeedingFull = new Set(nestedKinds);

        // Batch into at most 2 requests: one for full=false, one for full=true
        const fullFalseKinds = allKinds.filter(k => !kindsNeedingFull.has(k));
        const fullTrueKinds = allKinds.filter(k => kindsNeedingFull.has(k));

        const fetchPromises: Promise<{ data: SchemaData | null; full: boolean }>[] = [];

        // Fetch schemas that only need full=false
        if (fullFalseKinds.length > 0) {
            fetchPromises.push(
                fetchSchemas(versionToUse, fullFalseKinds, false)
                    .then(raw => ({ data: (raw as SchemaData | null), full: false }))
                    .catch(() => ({ data: null, full: false }))
            );
        }

        // Fetch schemas that need full=true (batched into single request)
        if (fullTrueKinds.length > 0) {
            fetchPromises.push(
                fetchSchemas(versionToUse, fullTrueKinds, true)
                    .then(raw => ({ data: (raw as SchemaData | null), full: true }))
                    .catch(() => ({ data: null, full: true }))
            );
        }

        // Wait for all fetches in parallel
        const results = await Promise.all(fetchPromises);

        // Merge results into schema data
        const newSchemaData: SchemaData = {};

        for (const result of results) {
            if (result.data) {
                Object.assign(newSchemaData, result.data);
            }
        }

        // Extract nested schema subsets (e.g., "deployment.spec" from full deployment schema)
        for (const item of nestedSchemas) {
            const [kind, property] = item.split(".");
            const kindSchema = newSchemaData[kind.toLowerCase()];
            if (kindSchema?.properties?.[property]) {
                newSchemaData[`${kind.toLowerCase()}.${property}`] = kindSchema.properties[property];
            }
        }

        setSchemaData((prev: SchemaData) => ({ ...prev, ...newSchemaData }));

        setProgress(100);
        setTimeout(() => setIsLoading(false), 500); // smooth finish
        return true;
    };

    return (
        <NodeContext.Provider value={{
            addNode,
            getSchema
        }}>
            <Dialog open={isLoading}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Loading Schema</DialogTitle>
                        <DialogDescription>
                            Fetching and extracting schemas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="pt-4">
                        <Progress value={progress} className="animate-pulse" />
                    </div>
                </DialogContent>
            </Dialog>

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
