"use client"

import { Handle, Position, useReactFlow, useStore } from "@xyflow/react"
import { useState, useCallback, useEffect, memo, useMemo } from "react"
import { SquareMinus, SquarePlus, Pencil, PencilOff } from "lucide-react"
import { publish } from "@/lib/eventBus"
import NodeContainer from "./flow.container.component"
import { shallow } from 'zustand/shallow';
import { getTypeColor } from "./flow.node.types"
import { useSchema } from "@/providers/schema.provider"
import { ConfigField } from "./flow.configfield.component"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ObjectRefNodeData, FlowEdge, Schema, PluginSlotEntry } from "@/types"
import { PluginSlots } from "./node.plugin-slots.component"

function inferSchemaFromValue(value: unknown): Schema {
    if (typeof value === 'string') return { type: 'string' };
    if (typeof value === 'number') return { type: 'integer' };
    if (typeof value === 'boolean') return { type: 'boolean' };
    if (Array.isArray(value)) return { type: 'array', items: {} };
    if (value && typeof value === 'object') return { type: 'object' };
    return { type: 'string' };
}

const TYPE_DEFAULTS: Record<string, unknown> = {
    string: '',
    integer: 0,
    boolean: false,
    object: {},
    array: [],
};

interface ObjectRefNodeProps {
    id: string;
    data: ObjectRefNodeData;
}

export function ObjectRefNodeComponent({ id, data }: ObjectRefNodeProps) {
    const { schemaData } = useSchema();
    const schemaKey = `${data.kind.toLowerCase()}.${data.objectRef}`;
    const schema: Schema = schemaData[schemaKey] || { properties: {} };
    const [values, setValues] = useState<Record<string, unknown>>(data.values || {});
    const [editing, setEditing] = useState(data.editing ?? false);
    const [visibleFields, setVisibleFields] = useState<string[]>([]);
    const { setNodes } = useReactFlow();
    const [isMinimized, setIsMinimized] = useState(false);

    // Update local values when data.values changes (from version loading)
    useEffect(() => {
        setValues(data.values || {});
        const keysWithValues = Object.keys(data.values || {});
        setVisibleFields(prev => Array.from(new Set([...prev, ...keysWithValues])));
    }, [data.values]);

    // Sync internal state back to the global node data
    useEffect(() => {
        const keysWithValues = Object.keys(values || {});
        setVisibleFields((prev) => Array.from(new Set([...prev, ...keysWithValues])));

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
    }, [values]);
    
    const edges = useStore(
        (s) => s.edges.filter((e: any) => e.target === id),
        shallow
    ) as FlowEdge[];

    const allFields = useMemo(() => Object.keys(schema?.properties || {}), [schema]);
    const [addFieldOpen, setAddFieldOpen] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState('string');

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
            publish(`${id}.${path}`, newVal);
            return updated;
        });
    }, [id]);

    const handleAddField = (field: string) => {
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
                    <div className="text-sm font-semibold flex flex-row">({data.kind}) {data.objectRef}.ref</div>
                    <div className="flex-grow" />
                    <button
                        className="shrink-0 p-1 rounded hover:bg-muted cursor-pointer mr-1"
                        onClick={() => setEditing(e => !e)}
                        title={editing ? "Stop editing" : "Edit"}
                    >
                        {editing ? <Pencil size={13} /> : <PencilOff size={13} className="text-muted-foreground" />}
                    </button>
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
                    <ConfigField
                        key={key}
                        label={key}
                        value={values[key]}
                        schema={schema?.properties?.[key] || inferSchemaFromValue(values[key])}
                        path={key}
                        onChange={handleValueChange}
                        nodeId={id}
                        edges={edges}
                        mode="objectRef"
                        readOnly={!editing}
                        onRemove={!editing ? undefined : () => {
                            setVisibleFields((prev) => prev.filter((f) => f !== key));
                            setValues(prev => {
                                const updated = { ...prev };
                                delete updated[key];
                                publish(`${id}.${key}`, undefined);
                                return updated;
                            });
                        }}
                    />
                ))}
                {editing && (
                    <div className="pt-3 mt-2 border-t space-y-2">
                        <Select value="" onValueChange={(field) => {
                            if (field === '__custom__') {
                                setAddFieldOpen(true);
                                setNewFieldName('');
                                setNewFieldType('string');
                            } else {
                                handleAddField(field);
                            }
                        }}>
                            <SelectTrigger className="w-full h-6 cursor-pointer bg-background">
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
                                <SelectItem value="__custom__" className="text-muted-foreground italic border-t mt-1 pt-1">
                                    + Custom field...
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
                            <DialogContent className="max-w-xs">
                                <DialogHeader>
                                    <DialogTitle>Add Custom Field</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3">
                                    <Input
                                        placeholder="Field name"
                                        value={newFieldName}
                                        onChange={(e) => setNewFieldName(e.target.value)}
                                    />
                                    <Select value={newFieldType} onValueChange={setNewFieldType}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['string', 'integer', 'boolean', 'object', 'array'].map((t) => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button
                                        size="sm"
                                        disabled={!newFieldName.trim() || visibleFields.includes(newFieldName.trim())}
                                        onClick={() => {
                                            const name = newFieldName.trim();
                                            handleAddField(name);
                                            setValues(prev => ({ ...prev, [name]: TYPE_DEFAULTS[newFieldType] ?? '' }));
                                            setAddFieldOpen(false);
                                        }}
                                    >
                                        Add
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
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
export const ObjectRefNode = memo(
    ObjectRefNodeComponent,
    (prev, next) => JSON.stringify(prev.data) === JSON.stringify(next.data)
);