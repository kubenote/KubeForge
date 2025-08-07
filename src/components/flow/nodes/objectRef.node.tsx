"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Handle, NodeProps, Position, useReactFlow, useStore } from "@xyflow/react"
import { useState, useCallback, useEffect } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "components/components/ui/tooltip"
import { useVersion } from "@/providers/VersionProvider"
import { publish, subscribe } from "components/lib/eventBus"
import { Trash } from "lucide-react";
import { shallow } from 'zustand/shallow';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useMemo } from "react"
import { Checkbox } from "components/components/ui/checkbox"
import NodeContainer from "./node.container"
import { memo } from "react";
import { typeColors } from "./node.types"
import { useSchema } from "components/providers/SchemaProvider"

const ConfigField = ({ label, value, schema, path, onChange, nodeId, edges }: {
    label: string;
    value: any;
    schema: any;
    path: string;
    onChange: (path: string, val: any) => void;
    nodeId: string;
    edges: any[];
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const [visibleFields, setVisibleFields] = useState<string[]>([]);

    useEffect(() => {
        const keysWithValues = Object.keys(value || {});
        setVisibleFields((prev) => Array.from(new Set([...prev, ...keysWithValues])));
    }, [value]);

    const typeArray = (Array.isArray(schema?.type) ? schema?.type : [schema?.type || typeof value]) || "string";
    const valueType = schema?.$ref ? 'objectRef' : typeArray[0] || "string";
    const isArray = Array.isArray(value) || valueType === "array";
    const isObject = valueType === "object" && value !== null && !isArray;

    const targetHandleId = `target-${label}`;
    const edge = edges.find((e) => e.target === nodeId && e.targetHandle === targetHandleId);
    const isConnected = !!edge;

    useEffect(() => {
        if (!isConnected || !edge?.source || !edge?.sourceHandle) return;

        const field = edge.sourceHandle.replace("source-", "");
        const sourceFieldId = `${edge.source}.${field}`;
        const unsub = subscribe(sourceFieldId, (val) => {
            onChange(path, val);
        });

        return unsub;
    }, [isConnected, edge?.source, edge?.sourceHandle]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const parsedValue = valueType === "number" || valueType === "integer" ? Number(inputValue) : inputValue;
        onChange(path, parsedValue);

        const selfId = `${nodeId}.${label}`;
        publish(selfId, parsedValue);
    };

    const handleBooleanChange = (bool: boolean) => {
        onChange(path, bool);

        const selfId = `${nodeId}.${label}`;
        publish(selfId, bool);
    };


    return (
        <div className="pl-2 border-muted space-y-1">
            <div className="relative flex items-center gap-2 min-h-8">
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
                    {schema?.description && <TooltipContent className="max-w-xs">{schema?.description}</TooltipContent>}
                </Tooltip>

                {isArray && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-4 h-4 p-0"
                        onClick={() => {
                            const newItem = {}; // Default empty item
                            const updatedArray = Array.isArray(value) ? [...value, newItem] : [newItem];
                            onChange(path, updatedArray);

                            const selfId = `${nodeId}.${label}`;
                            publish(selfId, updatedArray);
                            setCollapsed(false);
                        }}
                    >+</Button>
                )}

                {(isObject || isArray) ? (
                    <>
                        <span className={`text-xs ml-2 ${typeColors[valueType]}`}>{valueType}</span>
                        <span className="text-xs ml-auto text-[#333]">{isArray ? "[" : "{"}</span>
                    </>
                ) : (
                    <>
                        <span className={`text-xs ml-2 ${typeColors[valueType]}`}>{valueType}</span>
                        {valueType !== "objectRef" &&
                            valueType == "boolean" ? <div className="flex w-full pr-8"><div className="flex-grow" /><Checkbox onCheckedChange={(res) => handleBooleanChange(res)} /></div> : <Input
                            className="ml-2 h-6 px-2 py-0 text-xs rounded-sm disabled:bg-[#e0e0e0] disabled:border-[#bdbdbd]"
                            value={String(value ?? "")}
                            onChange={!isConnected ? handleChange : undefined}
                            disabled={isConnected}
                        />
                        }
                    </>
                )}
            </div>

            {!collapsed && isObject && (
                <div className="space-y-1 ml-2">
                    {visibleFields.map((key) => (
                        <div key={key} className="flex relative items-start group">
                            <button
                                onClick={() => {
                                    setVisibleFields(prev => prev.filter(f => f !== key));

                                    // Remove from value object
                                    const updated = { ...(value || {}) };
                                    delete updated[key];
                                    onChange(path, updated);

                                    publish(`${nodeId}.${label}`, updated);
                                }}
                                className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash className="w-4 h-4 text-red-500 hover:text-red-700 cursor-pointer" />
                            </button>
                            <ConfigField
                                label={key}
                                value={value?.[key]}
                                schema={schema?.properties?.[key]}
                                path={`${path}.${key}`}
                                onChange={onChange}
                                nodeId={nodeId}
                                edges={edges}
                            />
                        </div>
                    ))}

                    {(() => {
                        const availableFields = Object.keys(schema?.properties || {}).filter(
                            (k) => !visibleFields.includes(k)
                        );
                        return availableFields.length > 0 ? (
                            <Select
                                onValueChange={(field) => {
                                    if (!visibleFields.includes(field))
                                        setVisibleFields((prev) => [...prev, field]);
                                }}
                            >
                                <SelectTrigger className="h-6 w-full cursor-pointer">
                                    <SelectValue placeholder="Add field" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFields.map((k) => (
                                        <SelectItem key={k} value={k}>
                                            {k}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : null;
                    })()}


                    <Button onClick={() => setCollapsed(true)} variant="ghost" size="sm">
                        <span className="text-xs ml-auto text-[#333]">{"}"}</span>
                    </Button>
                </div>
            )}


            {!collapsed && isArray && Array.isArray(value) && (
                <div className=" space-y-1">
                    <div className="ml-4">
                        {value.map((item, index) => (
                            <ConfigField
                                key={index}
                                label={`${label}[${index}]`}
                                value={item}
                                schema={schema?.items}
                                path={`${path}.${index}`}
                                onChange={onChange}
                                nodeId={nodeId}
                                edges={edges}
                            />
                        ))}
                    </div>
                    <Button
                        onClick={() => setCollapsed(!collapsed)}
                        variant="ghost"
                        size="sm"
                    >
                        <span className="text-xs ml-auto text-[#333]">]</span>
                    </Button>
                </div>
            )}

        </div>
    );
};



export function ObjectRefNodeComponent({ id, data }: NodeProps) {
    const { schemaData } = useSchema();
    const schema = schemaData[`${data?.kind.toLowerCase()}.${data?.objectRef}`] || {};
    const [values, setValues] = useState(data?.values || {});
    const [visibleFields, setVisibleFields] = useState<string[]>([]);
    const { setNodes } = useReactFlow();

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
        (s) => s.edges.filter(e => e.target === id),
        shallow
    );


    const allFields = useMemo(() => Object.keys(schema.properties || {}), [schema]);

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
                    <div className="text-sm font-semibold flex flex-row">({data?.kind}){data?.objectRef}.ref {"{"}</div>
                    <div className="flex-grow" />
                    <span className={`text-xs mr-2 ${typeColors["objectRef"]}`}>objectRef</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        className={`!w-2 !h-2 !border-2 ${typeColors["objectRef"]} !bg-white`}
                        id={`source-${id}`}
                    />
                </div>
            </div>

            <div className="space-y-1 ">
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
                                value={values?.[key]}
                                schema={schema.properties?.[key]}
                                path={key}
                                onChange={handleValueChange}
                                nodeId={id}
                                edges={edges}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-2 mt-2 border-t flex items-center gap-2">
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

            <div className="mt-1 text-sm border-t-1 pt-2 mt-3">{"}"}</div>
        </NodeContainer>
    );
}


// Only re-render if `data` changes, not position/drag
export const ObjectRefNode = memo(
    ObjectRefNodeComponent,
    (prev, next) => JSON.stringify(prev.data) === JSON.stringify(next.data)
);