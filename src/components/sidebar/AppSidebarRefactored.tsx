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
import { Schema, GVK } from "@/types";
import { Separator } from "@/components/ui/separator";

interface SchemaInfoObject {
    name: string | GVK;
    data: Schema | undefined;
}

export function AppSidebarRefactored({
    versions,
    isReadOnly = false,
    ...props
}: {
    versions: string[];
    isReadOnly?: boolean;
} & React.ComponentProps<typeof Sidebar>) {
    // State
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [loadObject, setLoadObject] = React.useState<SchemaInfoObject | Record<string, never>>({});
    const [advancedMode, setAdvancedMode] = React.useState(false);

    // Context
    const { version, setVersion, schemaData, preRefSchemaData } = useVersion();
    const { schemaGvks } = useSchema();

    const handleVersionSelect = (version: string) => {
        setVersion(version);
    };

    const handleInfoClick = (newLoadObject: SchemaInfoObject) => {
        setLoadObject(newLoadObject);
        setDialogOpen(true);
    };

    return (
        <Sidebar {...props}>
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
                <Separator className="my-2" />
                <TemplatesSidebar className="h-64" isReadOnly={isReadOnly} />
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