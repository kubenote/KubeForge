"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Handle, NodeProps, Position, useReactFlow, useStore } from "@xyflow/react"
import { useState, useCallback, useEffect, useRef } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Label } from "components/components/ui/label"
import { Switch } from "components/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "components/components/ui/tooltip"
import { useVersion } from "@/providers/VersionProvider"
import { Dialog, DialogContent, DialogTitle } from "components/components/ui/dialog"
import { publish, subscribe } from "components/lib/eventBus"
import { nanoid } from 'nanoid';
import NodeContainer from "./node.container"
import { shallow } from 'zustand/shallow';
import { typeColors } from "./node.types"

import { memo } from "react";
import { useSchema } from "components/providers/SchemaProvider"
import { useNodeProvider } from "components/providers/NodeProvider"



const ConfigField = ({ label, value, schema, path, kind, onChange, nodeId, edges }: {
    label: string;
    value: any;
    schema: any;
    path: string;
    kind: string;
    onChange: (path: string, val: any) => void;
    nodeId: string;
    edges: any[];
}) => {
    const [collapsed, setCollapsed] = useState(true);
    const typeArray = Array.isArray(schema.type) ? schema.type : [schema.type || typeof value];
    const valueType = schema?.$ref ? 'objectRef' : typeArray[0] || "string";
    const isArray = Array.isArray(value) || valueType === "array";
    const isObject = valueType === "object" && value !== null && !isArray;
    const { addNode } = useNodeProvider();

    const targetHandleId = `target-${label}`;
    const edge = edges.find((e) => e.target === nodeId && e.targetHandle === targetHandleId);
    const isConnected = !!edge;

    useEffect(() => {
        if (!isConnected || !edge?.source || !edge?.sourceHandle) return;

        const field = edge.sourceHandle.replace("source-", "");
        const sourceFieldId = `${edge.source}.${field}`;

        if (valueType !== "objectRef") {
            const unsub = subscribe(sourceFieldId, (val) => {
                onChange(path, val);
            });

            return unsub;
        } else {
            const refValue = edge.source
            onChange(path, `#ref-${refValue}`);

            const selfId = `${nodeId}.${label}`;
            publish(selfId, `#ref-${refValue}`);
        }
    }, [isConnected, edge?.source, edge?.sourceHandle]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const parsedValue = valueType === "number" || valueType === "integer" ? Number(inputValue) : inputValue;
        onChange(path, parsedValue);

        const selfId = `${nodeId}.${label}`;
        publish(selfId, parsedValue);
    };

    return (
        <div className="pl-2 border-muted space-y-1">
            <div className="relative flex items-center gap-2 min-h-8">
                {!isObject && !isArray && (
                    <Handle
                        type="target"
                        position={Position.Left}
                        className={`!w-2 !h-2 !border-2 ${typeColors[valueType]} !bg-white`}
                        id={targetHandleId}
                    />
                )}

                {(isObject || isArray) ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-4 h-4 p-0 absolute left-[-8] top-1/2 -translate-y-1/2"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </Button>
                ) : <div className="w-0" />}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={`text-xs text-muted-foreground ${(isObject || isArray) && "pl-2"}`}>{label}</span>
                    </TooltipTrigger>
                    {schema.description && <TooltipContent className="max-w-xs">{schema.description}</TooltipContent>}
                </Tooltip>

                {(isObject || isArray) ? (
                    <>
                        <span className={`text-xs ml-2 ${typeColors[valueType]}`}>{valueType}</span>
                        <span className="text-xs ml-auto text-[#333]">{isArray ? "[" : "{"}</span>
                    </>
                ) : (
                    <>
                        <span className={`text-xs ml-2 ${typeColors[valueType]}`}>{valueType}</span>
                        {valueType !== "objectRef" ? (
                            <Input
                                className="ml-2 h-6 px-2 py-0 text-xs rounded-sm disabled:bg-[#e0e0e0] disabled:border-[#bdbdbd]"
                                value={String(value ?? "")}
                                onChange={!isConnected ? handleChange : undefined}
                                disabled={isConnected}
                            />
                        ) : !isConnected && (<button onClick={() => {
                            addNode({ targetNode: nodeId, data: { nodeId: nodeId, kind: kind, objectRef: label }, type: 'ObjectRefNode' })
                        }} className="ml-2 h-6 px-2 py-0 text-xs rounded-sm border cursor-pointer ml-auto bg-gray-100 hover:bg-gray-200">
                            Create {label} node
                        </button>)}
                    </>
                )}

                {!isObject && !isArray && valueType !== "objectRef" && (
                    <Handle
                        type="source"
                        position={Position.Right}
                        className={`!w-2 !h-2 !border-2 ${typeColors[valueType]} !bg-white`}
                        id={`source-${label}`}
                    />
                )}
            </div>

            {!collapsed && (isObject || isArray) && (
                <div className={"space-y-1"}>
                    <div className="ml-2 ">
                        {Object.entries(schema.properties ?? {}).map(([k, s]) => (
                            <ConfigField
                                key={k}
                                label={k}
                                value={value?.[k]}
                                schema={s}
                                path={`${path}.${k}`}
                                onChange={onChange}
                                nodeId={nodeId}
                                kind={kind}
                                edges={edges}
                            />
                        ))}
                    </div>
                    <Button
                        onClick={() => setCollapsed(!collapsed)}
                        variant="ghost"
                        size={"sm"}
                    >
                        <span className="text-xs ml-auto text-[#333]">{isArray ? "]" : "}"}</span>
                    </Button>
                </div>
            )}
        </div>
    );
};

function KindNodeComponent({ id, data }: NodeProps) {
    const [showWarning, setShowWarning] = useState(false);
    const { schemaData } = useSchema()
    const schema = schemaData[data?.type.toLowerCase()];
    const [values, setValues] = useState(data?.values || {});

    const { setNodes } = useReactFlow();

    // Sync internal state back to the global node data
    useEffect(() => {
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
    }, [values]);



    const edges = useStore(
        (s) => s.edges.filter(e => e.target === id),
        shallow
    );

    const handleValueChange = useCallback((path: string, newVal: any) => {
        setValues(prev => {
            const updated = structuredClone(prev);
            const parts = path.split(".");
            const last = parts.pop()!;
            const nested = parts.reduce((acc: any, key: string) => {
                if (!acc[key]) acc[key] = {};
                return acc[key];
            }, updated);
            nested[last] = newVal;

            const pubId = `${id}.${path}`;
            console.log(`🔊 Publishing: ${pubId} =`, newVal);
            publish(pubId, newVal); // ✅ Trigger update

            return updated;
        });
    }, [id]);


    return (
        <NodeContainer nodeId={id}>
            <div className="text-sm font-semibold flex flex-row border-b-1 pb-2 mb-3">{data.kind}.yaml {"{"} </div>

            <div className="space-y-1 pl-2">
                {Object.entries(schema.properties ?? {}).map(([key, fieldSchema]) => (
                    <ConfigField
                        key={key}
                        label={key}
                        value={values?.[key]}
                        schema={fieldSchema}
                        path={key}
                        kind={data?.kind}
                        onChange={handleValueChange}
                        nodeId={id}
                        edges={edges}
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