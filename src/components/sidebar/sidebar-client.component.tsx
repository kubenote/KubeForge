'use client';

import * as React from "react";
import { VersionSwitcher } from "./version-switcher";
import { SearchForm } from "./search-form";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useVersion } from "../../providers/VersionProvider";
import { BoxIcon, InfoIcon } from "lucide-react";
import { k8sIcons } from "../data/k8sIcons";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

import { useReactFlow } from '@xyflow/react';
import MonacoComponent from "../dialog/monaco.component";
import * as ApiVersion from "@/components/data/apiVersion.json"
import { capitalize } from "components/helpers/textTransform";
import { nanoid } from 'nanoid';


export function AppSidebarClient({
    versions,
    ...props
}: {
    versions: string[];
} & React.ComponentProps<typeof Sidebar>) {
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [downloadingVersion, setDownloadingVersion] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [loadObject, setLoadObject] = React.useState({});
    const [advancedMode, setAdvancedMode] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

    const { version, setVersion, schemaData, preRefSchemaData } = useVersion();
    const { addNodes } = useReactFlow();


    const handleSelect = (version: string) => {
        setIsDownloading(true);
        setDownloadingVersion(version)
        setProgress(0);

        const events = new EventSource(`/api/schema/stream?version=${version}`);

        events.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.progress !== undefined) setProgress(data.progress);
            if (data.done) {
                setIsDownloading(false);
                setVersion(version);
                events.close();
            }
        };

        events.onerror = () => {
            events.close();
            setIsDownloading(false);
            alert("An error occurred during schema download.");
        };
    };

    React.useEffect(() => {
        const dop = Object.keys(schemaData).join(", ");
        console.log(`Schema data updated: ${dop}`);
    }, [schemaData])

    const matchedKeys = new Set<string>();


    return (
        <Sidebar {...props}>
            <Dialog open={isDownloading}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Downloading Kubernetes Schema</DialogTitle>
                        <DialogDescription>
                            Fetching and extracting schemas for <strong>{downloadingVersion ?? "v1.33.3"}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="pt-4">
                        <Progress value={progress} className="animate-pulse" />
                    </div>
                </DialogContent>
            </Dialog>

            <SidebarHeader>
                <VersionSwitcher
                    versions={versions}
                    defaultVersion={version ?? "latest"}
                    onSelect={handleSelect}
                />
                <SearchForm onChange={(e) => setSearchQuery(e)} />
                <div className="flex items-center space-x-2 px-2">
                    <Label htmlFor="airplane-mode">Advanced</Label>
                    <Switch onCheckedChange={() => setAdvancedMode(!advancedMode)} id="airplane-mode" />
                </div>
            </SidebarHeader>



            <SidebarContent>
                {/* We create a SidebarGroup for each parent. */}
                {advancedMode ? (
                    <SidebarGroup key="schemas">
                        <SidebarGroupLabel>Deployment Scripts</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="max-h-[calc(100vh-220px)] overflow-y-auto">
                                {Object.keys(schemaData)
                                    .filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((item) => (
                                        <SidebarMenuItem key={item}>
                                            <SidebarMenuButton
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const schema = item;

                                                    addNodes({
                                                        id: nanoid(),
                                                        type: 'ConfigNode', // your custom node type
                                                        position: {
                                                            x: 100, // offset to avoid overlap
                                                            y: 100,
                                                        },
                                                        data: { type: schema, kind: item, values: { kind: capitalize(item), apiVersion: ApiVersion[item] } },
                                                    });
                                                }}
                                                asChild isActive={item}>
                                                <span
                                                    className="group/item text-xs cursor-pointer inline-flex items-center relative overflow-hidden whitespace-nowrap text-ellipsis max-w-[220px]"
                                                    data-tooltip-id="sidebar-item-tooltip"
                                                    title={item}
                                                >
                                                    <BoxIcon className="mr-1 shrink-0" />
                                                    <span className="truncate">{item}</span>
                                                    <span
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setLoadObject({ name: item, data: preRefSchemaData[item] });
                                                            setDialogOpen(true);
                                                        }}
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
                ) : (
                    Object.entries(k8sIcons).map(([groupLabel, items]) => {
                        const matchedGroupItems = items.filter(({ name }) => {
                            if (schemaData[name]) {
                                matchedKeys.add(name);
                                return name.toLowerCase().includes(searchQuery.toLowerCase());
                            }
                            return false;
                        });

                        if (matchedGroupItems.length === 0) return null;

                        return (
                            <SidebarGroup key={groupLabel}>
                                <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu className="max-h-[calc(100vh-210px)] overflow-y-auto">
                                        {matchedGroupItems.map(({ name, icon, info }) => (
                                            <SidebarMenuItem key={name}>
                                                <SidebarMenuButton
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        const schema = name;

                                                        addNodes({
                                                            id: nanoid(),
                                                            type: 'ConfigNode', // your custom node type
                                                            position: {
                                                                x: 100, // offset to avoid overlap
                                                                y: 100,
                                                            },
                                                            data: { type: schema, kind: name, values: { kind: capitalize(name), apiVersion: ApiVersion[name] } },
                                                        });
                                                    }}
                                                    asChild isActive={name}>
                                                    <span
                                                        className="group/item text-xs cursor-pointer inline-flex items-center relative overflow-hidden whitespace-nowrap text-ellipsis max-w-[220px]"
                                                        title={name}
                                                        data-tooltip-id="sidebar-item-tooltip"
                                                    >
                                                        {icon || <BoxIcon className="mr-1 shrink-0" />}
                                                        <span className="truncate">{name}</span>
                                                        <span
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setLoadObject({ name, data: preRefSchemaData[name] });
                                                                setDialogOpen(true);
                                                            }}
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
                    })
                )}
            </SidebarContent>





            <SidebarRail />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{loadObject?.name}</DialogTitle>
                        <DialogDescription>
                            {/* Replace this with whatever detail you want to show */}
                            This is more info about <strong>{"item"}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <MonacoComponent jsonData={loadObject?.data} />

                </DialogContent>
            </Dialog>
        </Sidebar >
    );
}
