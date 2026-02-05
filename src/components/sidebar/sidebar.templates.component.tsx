'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getTemplatesByCategory, Template } from '@/data/templates';
import { useReactFlow } from '@xyflow/react';
import { nanoid } from 'nanoid';
import { Node, Edge } from '@xyflow/react';

interface TemplatesSidebarProps {
    className?: string;
    isReadOnly?: boolean;
}

export function TemplatesSidebar({ className = '', isReadOnly = false }: TemplatesSidebarProps) {
    const categories = getTemplatesByCategory();
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        workloads: true,
    });
    const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow();

    const toggleCategory = (categoryId: string) => {
        setOpenCategories((prev) => ({
            ...prev,
            [categoryId]: !prev[categoryId],
        }));
    };

    /**
     * Apply a template by regenerating IDs and adding nodes/edges
     */
    const applyTemplate = (template: Template) => {
        const currentNodes = getNodes();
        const currentEdges = getEdges();

        // Create ID mapping from template IDs to new unique IDs
        const idMapping: Record<string, string> = {};
        template.nodes.forEach((node) => {
            idMapping[node.id] = nanoid();
        });
        template.edges.forEach((edge) => {
            idMapping[edge.id] = nanoid();
        });

        // Calculate offset position (place new nodes to the right of existing nodes)
        let maxX = 0;
        currentNodes.forEach((node) => {
            if (node.position.x > maxX) {
                maxX = node.position.x + 400; // Account for node width
            }
        });
        const offsetX = currentNodes.length > 0 ? maxX + 100 : 0;
        const offsetY = 50;

        // Clone and transform nodes
        const newNodes: Node[] = template.nodes.map((node) => {
            const newId = idMapping[node.id];

            // Deep clone the data and replace template references in values
            const clonedData = JSON.parse(JSON.stringify(node.data));
            const replaceRefs = (obj: unknown): unknown => {
                if (typeof obj === 'string') {
                    // Replace #ref-TEMPLATE_xxx with #ref-{newId}
                    if (obj.startsWith('#ref-TEMPLATE_')) {
                        const templateId = obj.slice(5); // Remove '#ref-'
                        return `#ref-${idMapping[templateId] || templateId}`;
                    }
                    return obj;
                }
                if (Array.isArray(obj)) {
                    return obj.map(replaceRefs);
                }
                if (typeof obj === 'object' && obj !== null) {
                    const result: Record<string, unknown> = {};
                    for (const [key, value] of Object.entries(obj)) {
                        result[key] = replaceRefs(value);
                    }
                    return result;
                }
                return obj;
            };

            const transformedData = replaceRefs(clonedData) as Record<string, unknown>;

            return {
                ...node,
                id: newId,
                position: {
                    x: node.position.x + offsetX,
                    y: node.position.y + offsetY,
                },
                data: transformedData,
                selected: true,
            };
        });

        // Clone and transform edges
        const newEdges: Edge[] = template.edges.map((edge) => ({
            ...edge,
            id: idMapping[edge.id],
            source: idMapping[edge.source],
            target: idMapping[edge.target],
        }));

        // Deselect existing nodes
        const updatedExistingNodes = currentNodes.map((node) => ({
            ...node,
            selected: false,
        }));

        // Add new nodes and edges
        setNodes([...updatedExistingNodes, ...newNodes]);
        setEdges([...currentEdges, ...newEdges]);

        // Fit view to show all nodes including new ones
        setTimeout(() => {
            fitView({ padding: 0.2, duration: 500 });
        }, 100);
    };

    return (
        <div className={`flex flex-col ${className}`}>
            <div className="flex items-center gap-2 px-3 pb-4 py-2 border-b">
                <Layers className="w-4 h-4" />
                <span className="font-medium text-sm">Templates</span>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {categories.map((category) => (
                        <Collapsible
                            key={category.id}
                            open={openCategories[category.id]}
                            onOpenChange={() => toggleCategory(category.id)}
                        >
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2 font-medium"
                                >
                                    {openCategories[category.id] ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                    {category.name}
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {category.templates.length}
                                    </span>
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-1">
                                {category.templates.map((template) => (
                                    <div
                                        key={template.id}
                                        className={`group flex items-center gap-2 p-2 rounded-md ${
                                            isReadOnly
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:bg-muted cursor-pointer'
                                        }`}
                                        onClick={() => !isReadOnly && applyTemplate(template)}
                                        title={isReadOnly ? 'Cannot add templates in read-only mode' : undefined}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {template.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground break-words">
                                                {template.description}
                                            </div>
                                        </div>
                                        {!isReadOnly && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyTemplate(template);
                                                }}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
