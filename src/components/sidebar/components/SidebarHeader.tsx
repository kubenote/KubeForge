'use client';

import * as React from "react";
import { VersionSwitcher } from "../sidebar.version.component";
import { SearchForm } from "../sidebar.search.component";
import { SidebarHeader } from "@/components/ui/sidebar"
import { Switch } from "../../ui/switch";
import { Label } from "../../ui/label";

interface SidebarHeaderProps {
    versions: string[];
    version: string | null;
    onVersionSelect: (version: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    advancedMode: boolean;
    onAdvancedModeChange: (advanced: boolean) => void;
}

export function AppSidebarHeader({
    versions,
    version,
    onVersionSelect,
    searchQuery,
    onSearchChange,
    advancedMode,
    onAdvancedModeChange
}: SidebarHeaderProps) {
    return (
        <SidebarHeader>
            <VersionSwitcher
                versions={versions}
                defaultVersion={version ?? "latest"}
                onSelect={onVersionSelect}
            />
            <SearchForm onChange={onSearchChange} />
            <div className="flex items-center space-x-2 px-2">
                <Label htmlFor="airplane-mode">Advanced</Label>
                <Switch 
                    onCheckedChange={() => onAdvancedModeChange(!advancedMode)} 
                    id="airplane-mode" 
                />
            </div>
        </SidebarHeader>
    );
}