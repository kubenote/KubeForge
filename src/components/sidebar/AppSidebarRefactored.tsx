'use client';

import * as React from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarRail,
} from "@/components/ui/sidebar"
import { useVersion } from "../../providers/VersionProvider";
import { useSchema } from "@/providers/SchemaProvider";
import { AppSidebarHeader } from "./components/SidebarHeader";
import { AdvancedModeSidebar } from "./components/AdvancedModeSidebar";
import { StandardModeSidebar } from "./components/StandardModeSidebar";
import { SchemaInfoDialog } from "./components/SchemaInfoDialog";
import { TemplatesSidebar } from "./sidebar.templates.component";
import { LayersSidebar } from "./LayersSidebar";
import { GVK } from "@/types";
import { IconSidebar, SidebarView } from "./IconSidebar";
import { HelperComponent } from "../dialog/dialog.helper.component";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BoxIcon, Zap } from "lucide-react";
import { SearchForm } from "./sidebar.search.component";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function AppSidebarRefactored({
    versions,
    isReadOnly = false,
    integrationsPanel,
    helpTopics = [],
    ...props
}: {
    versions: string[];
    isReadOnly?: boolean;
    integrationsPanel?: React.ReactNode;
    helpTopics?: string[];
} & React.ComponentProps<typeof Sidebar>) {
    // State
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogKind, setDialogKind] = React.useState<string | null>(null);
    const [dialogGvk, setDialogGvk] = React.useState<GVK | null>(null);
    const [advancedMode, setAdvancedMode] = React.useState(false);
    const [activeView, setActiveView] = React.useState<SidebarView>('workloads');

    // Context
    const { version, setVersion, schemaData } = useVersion();
    const { schemaGvks } = useSchema();

    const handleVersionSelect = (version: string) => {
        setVersion(version);
    };

    const handleStandardInfoClick = (kind: string) => {
        setDialogKind(kind);
        setDialogGvk(null);
        setDialogOpen(true);
    };

    const handleAdvancedInfoClick = (gvk: GVK) => {
        setDialogKind(null);
        setDialogGvk(gvk);
        setDialogOpen(true);
    };

    return (
        <Sidebar {...props}>
            <div className="flex h-full w-full">
                <IconSidebar
                    activeView={activeView}
                    onViewChange={setActiveView}
                    showIntegrations={!!integrationsPanel}
                    bottomSlot={<>{helpTopics.length > 0 && <HelperComponent topics={helpTopics} />}<ThemeToggle /></>}
                />
                <div className="flex flex-col flex-1 min-w-0">
                    <AppSidebarHeader
                        versions={versions}
                        version={version}
                        onVersionSelect={handleVersionSelect}
                    />
                    {activeView === 'workloads' ? (
                        <>
                        <div className="flex items-center gap-2 px-3 py-2 pb-4 border-b shrink-0">
                            <BoxIcon className="w-4 h-4" />
                            <span className="font-medium text-sm">Resources</span>
                        </div>
                        <div className="px-2 py-2 border-b space-y-2 shrink-0">
                            <SearchForm onChange={setSearchQuery} />
                            <div className="flex items-center space-x-2 px-2">
                                <Label htmlFor="airplane-mode">Advanced</Label>
                                <Switch
                                    onCheckedChange={() => setAdvancedMode(!advancedMode)}
                                    id="airplane-mode"
                                />
                            </div>
                        </div>
                        <SidebarContent>
                            {advancedMode ? (
                                <AdvancedModeSidebar
                                    schemaGvks={schemaGvks}
                                    searchQuery={searchQuery}
                                    schemaData={schemaData}
                                    onInfoClick={handleAdvancedInfoClick}
                                />
                            ) : (
                                <StandardModeSidebar
                                    schemaGvks={schemaGvks}
                                    searchQuery={searchQuery}
                                    onInfoClick={handleStandardInfoClick}
                                />
                            )}
                        </SidebarContent>
                        </>
                    ) : activeView === 'layers' ? (
                        <SidebarContent>
                            <LayersSidebar />
                        </SidebarContent>
                    ) : activeView === 'integrations' && integrationsPanel ? (
                        <SidebarContent>
                            <div className="flex items-center gap-2 px-3 py-2 pb-4 border-b">
                                <Zap className="w-4 h-4" />
                                <span className="font-medium text-sm">Integrations</span>
                            </div>
                            {integrationsPanel}
                        </SidebarContent>
                    ) : (
                        <SidebarContent>
                            <TemplatesSidebar className="h-full" isReadOnly={isReadOnly} />
                        </SidebarContent>
                    )}
                </div>
            </div>

            <SidebarRail />

            <SchemaInfoDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                kind={dialogKind}
                gvk={dialogGvk}
                version={version}
            />
        </Sidebar>
    );
}
