"use client"

import { useReactFlow, useStore } from "@xyflow/react"
import { useState, useCallback, useEffect, memo } from "react"
import { publish } from "@/lib/eventBus"
import NodeContainer from "./flow.container.component"
import { shallow } from 'zustand/shallow';
import { useSchema } from "@/providers/SchemaProvider"
import { ConfigField } from "./flow.configfield.component"
import { KindNodeData, FlowEdge } from "@/types"
import { useReadOnly } from "@/contexts/ReadOnlyContext"

interface KindNodeProps {
    id: string;
    data: KindNodeData;
}

function KindNodeComponent({ id, data }: KindNodeProps) {
    const { schemaData } = useSchema()
    const schema = schemaData[data.type.toLowerCase()];
    const [values, setValues] = useState<Record<string, unknown>>(data.values || {});
    const { isReadOnly } = useReadOnly();

    // Debug logging (uncomment if needed for debugging)
    // console.log('KindNode debug:', {
    //     id,
    //     dataType: data.type,
    //     schemaKeys: Object.keys(schemaData),
    //     hasSchema: !!schema,
    //     schemaProperties: schema?.properties ? Object.keys(schema.properties) : 'no properties'
    // });

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
                    if (node.id !== id) return node; // 👈 Keeps exact same reference
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
            console.log(`🔊 Publishing: ${pubId} =`, newVal);
            publish(pubId, newVal);

            return updated;
        });
    }, [id]);


    return (
        <NodeContainer nodeId={id}>
            <div className="text-sm font-semibold flex flex-row border-b-1 pb-2 mb-3">{data.kind}.yaml {"{"} </div>

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
                        readOnly={isReadOnly}
                    />
                ))}
            </div>
            <div className="mt-1 text-sm border-t-1 pt-2 mt-3">{"}"}</div>
        </NodeContainer>
    );
}


// Only re-render if `data` changes, not position/drag
export const KindNode = memo(
    KindNodeComponent,
    (prev, next) => JSON.stringify(prev.data) === JSON.stringify(next.data)
);