'use client';

import * as React from "react";
import { VersionSwitcher } from "../sidebar.version.component";
import { SidebarHeader } from "@/components/ui/sidebar"

interface SidebarHeaderProps {
    versions: string[];
    version: string | null;
    onVersionSelect: (version: string) => void;
}

export function AppSidebarHeader({
    versions,
    version,
    onVersionSelect,
}: SidebarHeaderProps) {
    return (
        <SidebarHeader>
            <VersionSwitcher
                versions={versions}
                defaultVersion={version ?? "latest"}
                onSelect={onVersionSelect}
            />
        </SidebarHeader>
    );
}