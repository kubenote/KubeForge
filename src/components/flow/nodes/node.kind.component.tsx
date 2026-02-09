"use client"

import { useReactFlow, useStore } from "@xyflow/react"
import { useState, useCallback, useEffect, memo, useMemo } from "react"
import { Pencil, PencilOff } from "lucide-react"
import { publish } from "@/lib/eventBus"
import NodeContainer from "./flow.container.component"
import { shallow } from 'zustand/shallow';
import { useSchema } from "@/providers/schema.provider"
import { ConfigField } from "./flow.configfield.component"
import { KindNodeData, FlowEdge, Schema, PluginSlotEntry } from "@/types"
import { useReadOnly } from "@/contexts/read-only.context"
import { PluginSlots } from "./node.plugin-slots.component"
import { classifyFields, groupFieldsByClassification, CLASSIFICATION_META, type FieldClassification } from "@/lib/schema/fieldClassification"
import { FieldSectionHeader } from "./fields/field.section-header.component"

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
    const [showReadOnlyFields, setShowReadOnlyFields] = useState(data.showReadOnlyFields ?? false);
    const [collapsedSections, setCollapsedSections] = useState<Set<FieldClassification>>(() => new Set(['optional']));

    const { setNodes } = useReactFlow();

    // Update local values when data.values changes (from version loading)
    useEffect(() => {
        setValues(data.values || {});
    }, [data.values]);

    // Sync showReadOnlyFields from data (context menu toggle)
    useEffect(() => {
        setShowReadOnlyFields(data.showReadOnlyFields ?? false);
    }, [data.showReadOnlyFields]);

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
                            showReadOnlyFields,
                        },
                    };
                })
            );
        }
    }, [values, showReadOnlyFields, isReadOnly]);

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

    // Compute field classifications and groupings
    const { fieldGroups, classifications } = useMemo(() => {
        const requiredFields = schema?.required ?? []
        const allEntries = Object.entries(schema?.properties ?? {}) as [string, Schema][]
        const cls = classifyFields(schema?.properties ?? {}, data.kind, requiredFields)
        const filtered = showReadOnlyFields
            ? allEntries
            : allEntries.filter(([k]) => cls.get(k) !== 'readOnly')
        const groups = groupFieldsByClassification(filtered, cls)
        return { fieldGroups: groups, classifications: cls }
    }, [schema, data.kind, showReadOnlyFields])

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
            if (newVal === undefined) {
                delete nested[last];
            } else {
                nested[last] = newVal;
            }

            const pubId = `${id}.${path}`;
            publish(pubId, newVal);

            return updated;
        });
    }, [id]);

    const toggleSection = useCallback((cls: FieldClassification) => {
        setCollapsedSections(prev => {
            const next = new Set(prev)
            if (next.has(cls)) {
                next.delete(cls)
            } else {
                next.add(cls)
            }
            return next
        })
    }, [])

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
                {fieldGroups.map((group, groupIndex) => {
                    const expanded = !collapsedSections.has(group.classification)
                    return (
                        <div key={group.classification}>
                            <FieldSectionHeader
                                classification={group.classification}
                                fieldCount={group.fields.length}
                                expanded={expanded}
                                onToggle={() => toggleSection(group.classification)}
                                isFirst={groupIndex === 0}
                            />
                            {expanded && group.fields.map(([key, fieldSchema]) => (
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
                                    classification={classifications.get(key)}
                                />
                            ))}
                        </div>
                    )
                })}
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
