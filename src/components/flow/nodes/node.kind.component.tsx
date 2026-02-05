"use client"

import { useReactFlow, useStore } from "@xyflow/react"
import { useState, useCallback, useEffect, memo, useMemo } from "react"
import { Pencil, PencilOff } from "lucide-react"
import { publish } from "@/lib/eventBus"
import NodeContainer from "./flow.container.component"
import { shallow } from 'zustand/shallow';
import { useSchema } from "@/providers/SchemaProvider"
import { ConfigField } from "./flow.configfield.component"
import { KindNodeData, FlowEdge, Schema, PluginSlotEntry } from "@/types"
import { useReadOnly } from "@/contexts/ReadOnlyContext"
import { PluginSlots } from "./PluginSlots"

interface KindNodeProps {
    id: string;
    data: KindNodeData;
}

function KindNodeComponent({ id, data }: KindNodeProps) {
    const { schemaData } = useSchema()
    const schema = schemaData[data.type.toLowerCase()];
    const [values, setValues] = useState<Record<string, unknown>>(data.values || {});
    const [editing, setEditing] = useState(data.editing ?? false);
    const { isReadOnly } = useReadOnly();

    const { setNodes } = useReactFlow();

    // Update local values when data.values changes (from version loading)
    useEffect(() => {
        setValues(data.values || {});
    }, [data.values]);

    // Sync internal state back to the global node data (only when not read-only)
    useEffect(() => {
        if (!isReadOnly) {
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
        }
    }, [values, isReadOnly]);

    const edges = useStore(
        (s) => s.edges.filter((e: any) => e.target === id),
        shallow
    ) as FlowEdge[];

    const pluginSlots: PluginSlotEntry[] = (data.pluginSlots as PluginSlotEntry[] | undefined) || [];

    // Extract container names from values for the container picker
    const containerNames = useMemo(() => {
        const names: string[] = [];
        const containers = values?.containers as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(containers)) {
            for (const c of containers) {
                if (c.name && typeof c.name === 'string') names.push(c.name);
            }
        }
        return names;
    }, [values]);

    const handleContainerChange = useCallback((sourceNodeId: string, containerName: string) => {
        setNodes((prevNodes) =>
            prevNodes.map((node) => {
                if (node.id !== id) return node;
                const currentSlots: PluginSlotEntry[] = (node.data?.pluginSlots as PluginSlotEntry[] | undefined) || [];
                const updatedSlots = currentSlots.map((slot) =>
                    slot.sourceNodeId === sourceNodeId ? { ...slot, containerName } : slot
                );
                return { ...node, data: { ...node.data, pluginSlots: updatedSlots } };
            })
        );
    }, [id, setNodes]);

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


    return (
        <NodeContainer nodeId={id}>
            <div className="text-sm font-semibold flex flex-row items-center border-b-1 pb-2 mb-3">
                <span className="flex-grow">{data.kind}.yaml</span>
                <button
                    className="shrink-0 p-1 rounded hover:bg-muted cursor-pointer"
                    onClick={() => setEditing(e => !e)}
                    title={editing ? "Stop editing" : "Edit"}
                >
                    {editing ? <Pencil size={13} /> : <PencilOff size={13} className="text-muted-foreground" />}
                </button>
            </div>

            <div className="space-y-1 pl-2">
                {Object.entries(schema?.properties ?? {}).map(([key, fieldSchema]) => (
                    <ConfigField
                        key={key}
                        label={key}
                        value={values?.[key]}
                        schema={fieldSchema as Schema}
                        path={key}
                        kind={data.kind}
                        onChange={handleValueChange}
                        nodeId={id}
                        edges={edges}
                        mode="kind"
                        readOnly={isReadOnly || !editing}
                    />
                ))}
            </div>
            <PluginSlots
                nodeId={id}
                pluginSlots={pluginSlots}
                containerNames={containerNames}
                onContainerChange={handleContainerChange}
            />
        </NodeContainer>
    );
}


// Only re-render if `data` changes, not position/drag
export const KindNode = memo(
    KindNodeComponent,
    (prev, next) => JSON.stringify(prev.data) === JSON.stringify(next.data)
);
