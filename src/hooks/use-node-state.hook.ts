import { useState, useEffect, useCallback } from 'react';
import { useReactFlow, useStore } from "@xyflow/react";
import { shallow } from 'zustand/shallow';
import { publish } from "@/lib/eventBus";
import { FlowEdge } from '@/types';

interface UseNodeStateOptions {
    id: string;
    initialValues?: Record<string, unknown>;
}

export function useNodeState({ id, initialValues = {} }: UseNodeStateOptions) {
    const [values, setValues] = useState<Record<string, unknown>>(initialValues);
    const { setNodes } = useReactFlow();

    // Sync internal state back to the global node data
    useEffect(() => {
        setNodes((prevNodes) =>
            prevNodes.map((node) => {
                if (node.id !== id) return node;
                return {
                    ...node,
                    data: {
                        ...node.data,
                        values,
                    },
                };
            })
        );
    }, [values, id, setNodes]);

    // Get edges targeting this node
    const edges = useStore(
        (s) => s.edges.filter((e: any) => e.target === id),
        shallow
    ) as FlowEdge[];

    // Handle value changes with deep path support
    const handleValueChange = useCallback((path: string, newVal: unknown) => {
        setValues(prev => {
            const updated = structuredClone(prev);
            const parts = path.split(".");
            const last = parts.pop()!;
            const nested = parts.reduce((acc: Record<string, unknown>, key: string) => {
                if (!acc[key]) acc[key] = {};
                return acc[key] as Record<string, unknown>;
            }, updated);
            nested[last] = newVal;

            const pubId = `${id}.${path}`;
            publish(pubId, newVal);

            return updated;
        });
    }, [id]);

    return {
        values,
        setValues,
        edges,
        handleValueChange
    };
}