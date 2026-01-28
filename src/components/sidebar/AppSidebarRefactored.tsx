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
import { DownloadDialog } from "./components/DownloadDialog";
import { SchemaInfoDialog } from "./components/SchemaInfoDialog";
import { Schema, GVK } from "@/types";
import { safeJsonParseWithResult } from "@/lib/safeJson";

interface SchemaInfoObject {
    name: string | GVK;
    data: Schema | undefined;
}

export function AppSidebarRefactored({
    versions,
    ...props
}: {
    versions: string[];
} & React.ComponentProps<typeof Sidebar>) {
    // State
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [downloadingVersion, setDownloadingVersion] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [loadObject, setLoadObject] = React.useState<SchemaInfoObject | Record<string, never>>({});
    const [advancedMode, setAdvancedMode] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

    // Context
    const { version, setVersion, schemaData, preRefSchemaData } = useVersion();
    const { schemaGvks } = useSchema();

    const handleVersionSelect = (version: string) => {
        setIsDownloading(true);
        setDownloadingVersion(version);
        setProgress(0);

        const events = new EventSource(`/api/schema/stream?version=${version}`);

        events.onmessage = (event) => {
            const parseResult = safeJsonParseWithResult<{ progress?: number; done?: boolean }>(event.data);
            if (!parseResult.success || !parseResult.data) {
                console.error('Failed to parse event data:', parseResult.error);
                return;
            }
            const data = parseResult.data;
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

    const handleInfoClick = (newLoadObject: SchemaInfoObject) => {
        setLoadObject(newLoadObject);
        setDialogOpen(true);
    };

    return (
        <Sidebar {...props}>
            <DownloadDialog
                isOpen={isDownloading}
                downloadingVersion={downloadingVersion}
                progress={progress}
            />

            <AppSidebarHeader
                versions={versions}
                version={version}
                onVersionSelect={handleVersionSelect}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                advancedMode={advancedMode}
                onAdvancedModeChange={setAdvancedMode}
            />

            <SidebarContent>
                {advancedMode ? (
                    <AdvancedModeSidebar
                        schemaGvks={schemaGvks}
                        searchQuery={searchQuery}
                        schemaData={schemaData}
                        preRefSchemaData={preRefSchemaData}
                        onInfoClick={handleInfoClick}
                    />
                ) : (
                    <StandardModeSidebar
                        schemaGvks={schemaGvks}
                        searchQuery={searchQuery}
                        preRefSchemaData={preRefSchemaData}
                        onInfoClick={handleInfoClick}
                    />
                )}
            </SidebarContent>

            <SidebarRail />
            
            <SchemaInfoDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                loadObject={loadObject}
            />
        </Sidebar>
    );
}