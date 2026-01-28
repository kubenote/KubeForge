'use client';

import * as React from "react";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { BoxIcon, InfoIcon } from "lucide-react";
import { useNodeProvider } from "@/providers/NodeProvider";
import { GVK, SchemaData, Schema } from "@/types";

interface SchemaInfoObject {
    name: GVK;
    data: Schema | undefined;
}

interface AdvancedModeSidebarProps {
    schemaGvks: GVK[];
    searchQuery: string;
    schemaData: SchemaData;
    preRefSchemaData: SchemaData;
    onInfoClick: (loadObject: SchemaInfoObject) => void;
}

export function AdvancedModeSidebar({
    schemaGvks,
    searchQuery,
    schemaData,
    preRefSchemaData,
    onInfoClick
}: AdvancedModeSidebarProps) {
    const { addNode } = useNodeProvider();

    const filteredSchemas = schemaGvks.filter((item) => 
        item.kind.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddNode = (item: { kind: string; version: string }) => {
        addNode({ 
            data: { 
                type: item.kind, 
                kind: item.kind, 
                values: { kind: item.kind, apiVersion: item.version } 
            } 
        });
    };

    const handleInfoClick = (e: React.MouseEvent, item: GVK) => {
        e.preventDefault();
        onInfoClick({
            name: item,
            data: preRefSchemaData[item.kind.toLowerCase()]
        });
    };

    return (
        <SidebarGroup key="schemas">
            <SidebarGroupLabel>Deployment Scripts</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="max-h-[calc(100vh-220px)] overflow-y-auto">
                    {filteredSchemas.map((item) => (
                        <SidebarMenuItem key={item.group + item.kind}>
                            <SidebarMenuButton
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleAddNode(item);
                                }}
                                asChild
                            >
                                <span
                                    className="group/item text-xs cursor-pointer inline-flex items-center relative overflow-hidden whitespace-nowrap text-ellipsis max-w-[220px]"
                                    data-tooltip-id="sidebar-item-tooltip"
                                    title={item.kind}
                                >
                                    <BoxIcon className="mr-1 shrink-0" />
                                    <span className="truncate">{item.kind}</span>
                                    <span
                                        onClick={(e) => handleInfoClick(e, item)}
                                        className="absolute right-0 ml-1 opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-opacity"
                                    >
                                        <InfoIcon size={15} />
                                    </span>
                                </span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
                <SidebarMenuButton isActive={false} className="text-xs mt-2">
                    {Object.keys(schemaData).length} schemas available
                </SidebarMenuButton>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}