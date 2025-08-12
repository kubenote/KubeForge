"use client"

import { Handle, Position, useReactFlow, useStore } from "@xyflow/react"
import { useState, useCallback, useEffect, memo, useMemo } from "react"
import { SquareMinus, SquarePlus, Trash } from "lucide-react"
import { publish } from "components/lib/eventBus"
import NodeContainer from "./flow.container.component"
import { shallow } from 'zustand/shallow';
import { getTypeColor } from "./flow.node.types"
import { useSchema } from "components/providers/SchemaProvider"
import { ConfigField } from "./flow.configfield.component"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ObjectRefNodeData, FlowEdge, Schema } from "@/types"

interface ObjectRefNodeProps {
    id: string;
    data: ObjectRefNodeData;
}



export function ObjectRefNodeComponent({ id, data }: ObjectRefNodeProps) {
    const { schemaData } = useSchema();
    const schemaKey = `${data.kind.toLowerCase()}.${data.objectRef}`;
    const schema: Schema = schemaData[schemaKey] || { properties: {} };
    const [values, setValues] = useState<Record<string, unknown>>(data.values || {});
    const [visibleFields, setVisibleFields] = useState<string[]>([]);
    const { setNodes } = useReactFlow();
    const [isMinimized, setIsMinimized] = useState(false);

    // Update local values when data.values changes (from version loading)
    useEffect(() => {
        setValues(data.values || {});
        // Also update visible fields to match the new values
        const keysWithValues = Object.keys(data.values || {});
        setVisibleFields(prev => Array.from(new Set([...prev, ...keysWithValues])));
    }, [data.values]);


    // Sync internal state back to the global node data
    useEffect(() => {
        const keysWithValues = Object.keys(values || {});
        setVisibleFields((prev) => Array.from(new Set([...prev, ...keysWithValues])));

        setNodes((prevNodes) =>
            prevNodes.map((node) => {
                if (node.id !== id) return node; // ✅ Preserve reference for all others
                return {
                    ...node,
                    data: {
                        ...node.data,
                        values, // 🆕 new values injected only for target node
                    },
                };
            })
        );
    }, [values]);
    
    const edges = useStore(
        (s) => s.edges.filter((e: any) => e.target === id),
        shallow
    ) as FlowEdge[];

    const allFields = useMemo(() => Object.keys(schema?.properties || {}), [schema]);

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
            publish(`${id}.${path}`, newVal);
            return updated;
        });
    }, [id]);

    const handleAddField = (field: string) => {
        console.log(`Adding field: ${field}`);
        if (!visibleFields.includes(field)) {
            setVisibleFields(prev => [...prev, field]);
        }
    };

    return (
        <NodeContainer nodeId={id}>
            <div className="border-b-1 pb-2 mb-2">
                <div className="flex relative items-center ">
                    {/* Toggle button */}
                    {isMinimized ? (
                        <SquarePlus
                            size={15}
                            className="cursor-pointer mr-2 hover:text-[#888]"
                            onClick={() => setIsMinimized(false)} // Unminimize on click
                        />
                    ) : (
                        <SquareMinus
                            size={15}
                            className="cursor-pointer mr-2 hover:text-[#888]"
                            onClick={() => setIsMinimized(true)} // Minimize on click
                        />
                    )}
                    <div className="text-sm font-semibold flex flex-row">({data.kind}) {data.objectRef}.ref {"{"}</div>
                    <div className="flex-grow" />
                    <span className={`text-xs mr-2 ${getTypeColor("objectRef")}`}>objectRef</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        className={`!w-2 !h-2 !border-2 ${getTypeColor("objectRef")} !bg-white`}
                        id={`source-${id}`}
                    />
                </div>
            </div>

            <div
                className={`space-y-1 ${isMinimized ? 'max-h-0 overflow-hidden' : ''} transition-all duration-300 ease-in-out`}
            >
                {visibleFields.map((key) => (
                    <div key={key} className="flex relative items-start group">
                        <button
                            onClick={() => {
                                setVisibleFields((prev) => prev.filter((f) => f !== key));

                                setValues(prev => {
                                    const updated = { ...prev };
                                    delete updated[key];
                                    publish(`${id}.${key}`, undefined);
                                    return updated;
                                });
                            }}
                            className="absolute right-2 z-10 top-2 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                            title="Remove field"
                        >
                            <Trash className="w-4 h-4 text-red-500 hover:text-red-700 cursor-pointer" />
                        </button>
                        <div className="flex-grow">
                            <ConfigField
                                label={key}
                                value={values[key]}
                                schema={schema?.properties?.[key] || {}}
                                path={key}
                                onChange={handleValueChange}
                                nodeId={id}
                                edges={edges}
                                mode="objectRef"
                            />
                        </div>
                    </div>
                ))}
                <div className="pt-3 mt-2 border-t flex items-center gap-2">
                    <Select value="" onValueChange={(field) => {
                        handleAddField(field)
                    }}>
                        <SelectTrigger className="w-full h-6 cursor-pointer">
                            <SelectValue placeholder="Select field to add" />
                        </SelectTrigger>
                        <SelectContent>
                            {allFields
                                .filter((f) => !visibleFields.includes(f))
                                .map((field) => (
                                    <SelectItem key={field} value={field}>
                                        {field}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>



            <div className="mt-1 text-sm border-t-1 pt-2 mt-3">{"}"}</div>
        </NodeContainer>
    );
}


// Only re-render if `data` changes, not position/drag
export const ObjectRefNode = memo(
    ObjectRefNodeComponent,
    (prev, next) => JSON.stringify(prev.data) === JSON.stringify(next.data)
);