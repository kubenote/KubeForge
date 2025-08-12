"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Handle, Position } from "@xyflow/react"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, Trash } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "components/components/ui/tooltip"
import { publish, subscribe } from "components/lib/eventBus"
import { getTypeColor } from "./flow.node.types"
import { useNodeProvider } from "components/providers/NodeProvider"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "components/components/ui/checkbox"
import { Schema, FlowEdge } from "@/types"

interface ConfigFieldProps {
    label: string;
    value: unknown;
    schema: Schema;
    path: string;
    kind?: string;
    onChange: (path: string, val: unknown) => void;
    nodeId: string;
    edges: FlowEdge[];
    mode?: 'kind' | 'objectRef';
    readOnly?: boolean;
}

export const ConfigField = ({ 
    label, 
    value, 
    schema, 
    path, 
    kind, 
    onChange, 
    nodeId, 
    edges,
    mode = 'kind',
    readOnly = false
}: ConfigFieldProps) => {
    const [collapsed, setCollapsed] = useState(mode === 'kind');
    const [inputValue, setInputValue] = useState(String(value ?? ""));
    const { addNode } = useNodeProvider();

    // Update input value when the value prop changes (from version loading)
    useEffect(() => {
        setInputValue(String(value ?? ""));
    }, [value]);

    // Force re-render when nodeId changes (version switching)
    useEffect(() => {
        setInputValue(String(value ?? ""));
    }, [nodeId, value]);

    const typeArray = Array.isArray(schema?.type) ? schema?.type : [schema?.type || typeof value];
    const valueType = schema?.$ref ? 'objectRef' : typeArray[0] || "string";
    const isArray = Array.isArray(value) || valueType === "array";
    const isObject = valueType === "object" && value !== null && !isArray;

    const targetHandleId = `target-${label}`;
    const edge = edges.find((e) => e.target === nodeId && e.targetHandle === targetHandleId);
    const isConnected = !!edge;

    useEffect(() => {
        if (!isConnected || !edge?.source || !edge.sourceHandle) return;

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
        const newInputValue = e.target.value;
        setInputValue(newInputValue); // Update local state immediately for responsiveness
        const parsedValue = valueType === "number" || valueType === "integer" ? Number(newInputValue) : newInputValue;
        onChange(path, parsedValue);

        const selfId = `${nodeId}.${label}`;
        publish(selfId, parsedValue);
    };

    const handleBooleanChange = (checked: boolean | "indeterminate") => {
        const boolValue = checked === true;
        onChange(path, boolValue);

        const selfId = `${nodeId}.${label}`;
        publish(selfId, boolValue);
    };


    return (
        <div className="pl-2 border-muted space-y-1">
            <div className="relative flex items-center gap-2 min-h-8">
                {!isObject && !isArray && mode === 'kind' && (
                    <Handle
                        type="target"
                        position={Position.Left}
                        className={`!w-2 !h-2 !border-2 ${getTypeColor(valueType)} !bg-white`}
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
                    {schema?.description && <TooltipContent className="max-w-xs">{schema?.description}</TooltipContent>}
                </Tooltip>

                {isArray && mode === 'objectRef' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-4 h-4 p-0"
                        onClick={() => {
                            const newItem = {};
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
                        <span className={`text-xs ml-2 ${getTypeColor(valueType)}`}>{valueType}</span>
                        <span className="text-xs ml-auto text-[#333]">{isArray ? "[" : "{"}</span>
                    </>
                ) : (
                    <>
                        <span className={`text-xs ml-2 ${getTypeColor(valueType)}`}>{valueType}</span>
                        {valueType !== "objectRef" ? (
                            valueType === "boolean" && mode === 'objectRef' ? (
                                <div className="flex w-full pr-8">
                                    <div className="flex-grow" />
                                    <Checkbox 
                                        checked={Boolean(value)} 
                                        onCheckedChange={readOnly ? undefined : handleBooleanChange}
                                        disabled={readOnly}
                                    />
                                </div>
                            ) : (
                                <Input
                                    className="ml-2 h-6 px-2 py-0 text-xs rounded-sm disabled:bg-[#e0e0e0] disabled:border-[#bdbdbd]"
                                    value={inputValue}
                                    onChange={!isConnected && !readOnly ? handleChange : undefined}
                                    disabled={isConnected || readOnly}
                                />
                            )
                        ) : (
                            mode === 'kind' && !isConnected && (
                                <button 
                                    onClick={() => {
                                        if (!kind) return;
                                        addNode({ targetNode: nodeId, data: { nodeId: nodeId, kind: kind, objectRef: label }, type: 'ObjectRefNode' })
                                    }} 
                                    className="ml-2 h-6 px-2 py-0 text-xs rounded-sm border cursor-pointer ml-auto bg-gray-100 hover:bg-gray-200"
                                >
                                    Create {label} node
                                </button>
                            )
                        )}
                    </>
                )}

                {!isObject && !isArray && valueType !== "objectRef" && mode === 'kind' && (
                    <Handle
                        type="source"
                        position={Position.Right}
                        className={`!w-2 !h-2 !border-2 ${getTypeColor(valueType)} !bg-white`}
                        id={`source-${label}`}
                    />
                )}
            </div>

            {/* Object rendering */}
            {!collapsed && isObject && (
                <div className="space-y-1 ml-2">
                    {mode === 'kind' ? (
                        // Kind mode: show all properties from schema
                        Object.entries(schema?.properties ?? {}).map(([k, s]) => {
                            const valueAsRecord = value as Record<string, unknown>;
                            return (
                                <ConfigField
                                    key={k}
                                    label={k}
                                    value={valueAsRecord?.[k]}
                                    schema={s as Schema}
                                    path={`${path}.${k}`}
                                    onChange={onChange}
                                    nodeId={nodeId}
                                    kind={kind}
                                    edges={edges}
                                    mode={mode}
                                />
                            );
                        })
                    ) : (
                        // ObjectRef mode: only show properties that have values
                        Object.keys(value || {}).map((k) => {
                            const valueAsRecord = value as Record<string, unknown>;
                            return (
                                <ConfigField
                                    key={k}
                                    label={k}
                                    value={valueAsRecord?.[k]}
                                    schema={schema?.properties?.[k] || {}}
                                    path={`${path}.${k}`}
                                    onChange={onChange}
                                    nodeId={nodeId}
                                    kind={kind}
                                    edges={edges}
                                    mode={mode}
                                />
                            );
                        })
                    )}
                    
                    {/* Add field dropdown for objectRef mode */}
                    {mode === 'objectRef' && (() => {
                        const existingKeys = Object.keys(value || {});
                        const availableFields = Object.keys(schema?.properties || {}).filter(
                            (k) => !existingKeys.includes(k)
                        );
                        return availableFields.length > 0 ? (
                            <Select
                                onValueChange={readOnly ? undefined : (field) => {
                                    const newValue = { ...(value || {}), [field]: undefined };
                                    onChange(path, newValue);
                                }}
                                disabled={readOnly}
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

                    <Button
                        onClick={() => setCollapsed(!collapsed)}
                        variant="ghost"
                        size="sm"
                    >
                        <span className="text-xs ml-auto text-[#333]">{"}"}</span>
                    </Button>
                </div>
            )}

            {/* Array rendering */}
            {!collapsed && isArray && (
                <div className="space-y-1">
                    <div className={mode === 'kind' ? "ml-2" : "ml-4"}>
                        {mode === 'kind' ? (
                            Object.entries(schema?.properties ?? {}).map(([k, s]) => {
                                const valueAsRecord = value as Record<string, unknown>;
                                return (
                                    <ConfigField
                                        key={k}
                                        label={k}
                                        value={valueAsRecord?.[k]}
                                        schema={s as Schema}
                                        path={`${path}.${k}`}
                                        onChange={onChange}
                                        nodeId={nodeId}
                                        kind={kind}
                                        edges={edges}
                                        mode={mode}
                                    />
                                );
                            })
                        ) : (
                            Array.isArray(value) && value.map((item, index) => (
                                <ConfigField
                                    key={index}
                                    label={`${label}[${index}]`}
                                    value={item}
                                    schema={schema?.items || {}}
                                    path={`${path}.${index}`}
                                    onChange={onChange}
                                    nodeId={nodeId}
                                    edges={edges}
                                    mode={mode}
                                />
                            ))
                        )}
                    </div>
                    <Button
                        onClick={() => setCollapsed(!collapsed)}
                        variant="ghost"
                        size="sm"
                    >
                        <span className="text-xs ml-auto text-[#333]">{isArray ? "]" : "}"}</span>
                    </Button>
                </div>
            )}
        </div>
    );
};