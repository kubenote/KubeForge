'use client';

import * as React from "react";
import { VersionSwitcher } from "./sidebar.version.component";
import { SearchForm } from "./sidebar.search.component";
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

import MonacoComponent from "../dialog/dialog.monaco.component";
import { useSchema } from "components/providers/SchemaProvider";
import { useNodeProvider } from "components/providers/NodeProvider";


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
    const { schemaGvks } = useSchema();

    const { addNode } = useNodeProvider()


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
                                {(schemaGvks).filter((item) => item.kind.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((item) => (<SidebarMenuItem key={item.group + item.kind}>
                                        <SidebarMenuButton
                                            onClick={(e) => {
                                                e.preventDefault();

                                                addNode({ data: { type: item.kind, kind: item.kind, values: { kind: item.kind, apiVersion: item.version } } })

                                            }}
                                            asChild isActive={item.kind}>
                                            <span
                                                className="group/item text-xs cursor-pointer inline-flex items-center relative overflow-hidden whitespace-nowrap text-ellipsis max-w-[220px]"
                                                data-tooltip-id="sidebar-item-tooltip"
                                                title={item.kind}
                                            >
                                                <BoxIcon className="mr-1 shrink-0" />
                                                <span className="truncate">{item.kind}</span>
                                                <span
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setLoadObject({ name: item, data: preRefSchemaData[item.kind] });
                                                        setDialogOpen(true);
                                                    }}
                                                    className="absolute right-0 ml-1 opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-opacity"
                                                >
                                                    <InfoIcon size={15} />
                                                </span>
                                            </span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    )
                                    )}
                            </SidebarMenu>
                            <SidebarMenuButton isActive={false} className="text-xs mt-2">
                                {Object.keys(schemaData).length} schemas available
                            </SidebarMenuButton>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ) : (
                    Object.entries(k8sIcons).map(([groupLabel, items]) => {
                        type GVK = { group: string; version: string; kind: string };

                        // Build a lookup: "deployment" => { group:"apps", version:"v1", kind:"Deployment" }
                        const kindMap = new Map<string, GVK>(
                            schemaGvks.map(gvk => [gvk.kind.toLowerCase(), gvk])
                        );

                        const lcQuery = (searchQuery ?? "").toLowerCase();

                        const matchedGroupItems = items
                            .map(({ name, ...rest }) => {
                                const key = name.toLowerCase();
                                const gvk = kindMap.get(key);
                                if (!gvk) return null; // not a top-level kind

                                // optional search filtering
                                if (lcQuery && !gvk.kind.toLowerCase().includes(lcQuery) && !key.includes(lcQuery)) {
                                    return null;
                                }

                                matchedKeys.add(key);

                                // return with proper casing (from gvk.kind); also expose group/version if useful
                                return {
                                    ...rest,
                                    kind: gvk.kind,          // (or use a separate field)
                                    group: gvk.group,
                                    version: gvk.version,
                                };
                            })
                            .filter((x): x is NonNullable<typeof x> => Boolean(x));


                        if (matchedGroupItems.length === 0) return null;

                        return (
                            <SidebarGroup key={groupLabel}>
                                <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu className="max-h-[calc(100vh-210px)] overflow-y-auto">
                                        {matchedGroupItems.map(({ kind, icon, group, version, info }) => (
                                            <SidebarMenuItem key={group + kind}>
                                                <SidebarMenuButton
                                                    onClick={(e) => {
                                                        console.log(kind)
                                                        e.preventDefault();

                                                        addNode({ data: { type: kind, kind, values: { kind, apiVersion: version } } })
                                                    }}
                                                    asChild isActive={kind}>
                                                    <span
                                                        className="group/item text-xs cursor-pointer inline-flex items-center relative overflow-hidden whitespace-nowrap text-ellipsis max-w-[220px]"
                                                        title={kind}
                                                        data-tooltip-id="sidebar-item-tooltip"
                                                    >
                                                        {icon || <BoxIcon className="mr-1 shrink-0" />}
                                                        <span className="truncate">{kind}</span>
                                                        <span
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setLoadObject({ name, data: preRefSchemaData[kind.toLocaleLowerCase()] });
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
