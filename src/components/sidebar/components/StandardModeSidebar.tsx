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
import { k8sIcons } from "../../data/k8sIcons";
import { useNodeProvider } from "@/providers/NodeProvider";

interface StandardModeSidebarProps {
    schemaGvks: Array<{ kind: string; group: string; version: string }>;
    searchQuery: string;
    preRefSchemaData: any;
    onInfoClick: (loadObject: any) => void;
}

export function StandardModeSidebar({
    schemaGvks,
    searchQuery,
    preRefSchemaData,
    onInfoClick
}: StandardModeSidebarProps) {
    const { addNode } = useNodeProvider();
    const matchedKeys = new Set<string>();

    const handleAddNode = (kind: string, version: string) => {
        addNode({ 
            data: { 
                type: kind, 
                kind, 
                values: { kind, apiVersion: version } 
            } 
        });
    };

    const handleInfoClick = (e: React.MouseEvent, kind: string) => {
        e.preventDefault();
        onInfoClick({ 
            name: kind, 
            data: preRefSchemaData[kind.toLowerCase()] 
        });
    };

    const buildKindMap = (gvks: Array<{ kind: string; group: string; version: string }>) => {
        return new Map(gvks.map(gvk => [gvk.kind.toLowerCase(), gvk]));
    };

    const filterGroupItems = (
        items: Array<{ name: string; icon?: React.ReactNode; [key: string]: unknown }>,
        kindMap: Map<string, { kind: string; group: string; version: string }>,
        searchQuery: string
    ): Array<{ kind: string; group: string; version: string; icon?: React.ReactNode }> => {
        const lcQuery = (searchQuery ?? "").toLowerCase();

        return items
            .map(({ name, ...rest }) => {
                const key = name.toLowerCase();
                const gvk = kindMap.get(key);
                if (!gvk) return null; // not a top-level kind

                // optional search filtering
                if (lcQuery && !gvk.kind.toLowerCase().includes(lcQuery) && !key.includes(lcQuery)) {
                    return null;
                }

                matchedKeys.add(key);

                return {
                    ...rest,
                    kind: gvk.kind,
                    group: gvk.group,
                    version: gvk.version,
                };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x));
    };

    const kindMap = buildKindMap(schemaGvks);

    return (
        <>
            {Object.entries(k8sIcons).map(([groupLabel, items]) => {
                const matchedGroupItems = filterGroupItems(items, kindMap, searchQuery);

                if (matchedGroupItems.length === 0) return null;

                return (
                    <SidebarGroup key={groupLabel}>
                        <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="max-h-[calc(100vh-210px)] overflow-y-auto">
                                {matchedGroupItems.map(({ kind, icon, group, version, ...rest }) => (
                                    <SidebarMenuItem key={group + kind}>
                                        <SidebarMenuButton
                                            onClick={(e) => {
                                                console.log(kind);
                                                e.preventDefault();
                                                handleAddNode(kind, version);
                                            }}
                                            asChild
                                        >
                                            <span
                                                className="group/item text-xs cursor-pointer inline-flex items-center relative overflow-hidden whitespace-nowrap text-ellipsis max-w-[220px]"
                                                title={kind}
                                                data-tooltip-id="sidebar-item-tooltip"
                                            >
                                                {icon || <BoxIcon className="mr-1 shrink-0" />}
                                                <span className="truncate">{kind}</span>
                                                <span
                                                    onClick={(e) => handleInfoClick(e, kind)}
                                                    className="absolute right-0 ml-1 opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-opacity"
                                                >
                                                    <InfoIcon size={15} />
                                                </span>
                                            </span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                );
            })}
        </>
    );
}