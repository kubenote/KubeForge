'use client';

import React, { useState, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { GitCompare } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { ProjectDataService } from '@/services/project.data.service';
import { exportToYaml } from '@/lib/export';
import dynamic from 'next/dynamic';
import '@/lib/monaco-config';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import { useTheme } from '@/contexts/theme.context';

interface VersionForSelect {
    id: string;
    slug?: string | null;
    createdAt: string;
    message: string | null;
}

interface VersionDiffDialogProps {
    projectId: string;
    projectName: string;
    versions: VersionForSelect[];
}

export function VersionDiffDialog({
    projectId,
    projectName,
    versions,
}: VersionDiffDialogProps) {
    const [open, setOpen] = useState(false);
    const [leftVersionId, setLeftVersionId] = useState<string>('');
    const [rightVersionId, setRightVersionId] = useState<string>('');
    const [leftYaml, setLeftYaml] = useState<string>('');
    const [rightYaml, setRightYaml] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const { resolvedTheme } = useTheme();

    const formatVersionName = (version: VersionForSelect, index: number) => {
        const date = new Date(version.createdAt).toLocaleDateString();
        return `Version ${versions.length - index} (${date})`;
    };

    const loadVersionYaml = async (versionId: string, side: 'left' | 'right') => {
        if (!versionId) {
            if (side === 'left') setLeftYaml('');
            else setRightYaml('');
            return;
        }

        setLoading(true);
        try {
            const versionData = await ProjectDataService.loadProjectVersion(projectId, versionId);
            const yamlContent = exportToYaml(versionData.nodes, versionData.edges);
            if (side === 'left') {
                setLeftYaml(yamlContent);
            } else {
                setRightYaml(yamlContent);
            }
        } catch (error) {
            console.error(`Failed to load version for ${side} side:`, error);
            const errorMsg = '# Error loading version';
            if (side === 'left') setLeftYaml(errorMsg);
            else setRightYaml(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (leftVersionId) {
            loadVersionYaml(leftVersionId, 'left');
        }
    }, [leftVersionId]);

    useEffect(() => {
        if (rightVersionId) {
            loadVersionYaml(rightVersionId, 'right');
        }
    }, [rightVersionId]);

    // Reset state when drawer opens
    useEffect(() => {
        if (open && versions.length >= 2) {
            // Pre-select the two most recent versions
            setLeftVersionId(versions[1]?.id || '');
            setRightVersionId(versions[0]?.id || '');
        } else if (!open) {
            setLeftVersionId('');
            setRightVersionId('');
            setLeftYaml('');
            setRightYaml('');
        }
    }, [open, versions]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={versions.length < 2}
                    title={versions.length < 2 ? 'Need at least 2 versions to compare' : 'Compare versions'}
                >
                    <GitCompare className="w-4 h-4 mr-1" />
                    Compare
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="w-[90vw] max-w-[90vw] sm:max-w-[90vw] flex flex-col p-0"
            >
                <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <SheetTitle>Compare Versions - {projectName}</SheetTitle>
                </SheetHeader>

                <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
                    {/* Version selectors */}
                    <div className="flex gap-4 mb-4 shrink-0">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Left Version (Older)</label>
                            <Select value={leftVersionId} onValueChange={setLeftVersionId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select version" />
                                </SelectTrigger>
                                <SelectContent>
                                    {versions.map((version, index) => (
                                        <SelectItem
                                            key={version.id}
                                            value={version.id}
                                            disabled={version.id === rightVersionId}
                                        >
                                            {formatVersionName(version, index)}
                                            {index === 0 && ' (Latest)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Right Version (Newer)</label>
                            <Select value={rightVersionId} onValueChange={setRightVersionId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select version" />
                                </SelectTrigger>
                                <SelectContent>
                                    {versions.map((version, index) => (
                                        <SelectItem
                                            key={version.id}
                                            value={version.id}
                                            disabled={version.id === leftVersionId}
                                        >
                                            {formatVersionName(version, index)}
                                            {index === 0 && ' (Latest)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {loading && (
                        <div className="text-center py-4 text-muted-foreground shrink-0">
                            Loading versions...
                        </div>
                    )}

                    {/* Side-by-side editors */}
                    <div className="flex gap-4 flex-1 min-h-0">
                        <div className="flex-1 border rounded overflow-hidden flex flex-col">
                            <div className="bg-muted px-3 py-2 text-sm font-medium border-b shrink-0">
                                {leftVersionId
                                    ? formatVersionName(
                                        versions.find((v) => v.id === leftVersionId)!,
                                        versions.findIndex((v) => v.id === leftVersionId)
                                    )
                                    : 'Select a version'}
                            </div>
                            <div className="flex-1 min-h-0">
                                <Editor
                                    height="100%"
                                    defaultLanguage="yaml"
                                    value={leftYaml || '# Select a version to view'}
                                    options={{
                                        readOnly: true,
                                        wordWrap: 'on',
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        lineNumbers: 'on',
                                    }}
                                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                />
                            </div>
                        </div>
                        <div className="flex-1 border rounded overflow-hidden flex flex-col">
                            <div className="bg-muted px-3 py-2 text-sm font-medium border-b shrink-0">
                                {rightVersionId
                                    ? formatVersionName(
                                        versions.find((v) => v.id === rightVersionId)!,
                                        versions.findIndex((v) => v.id === rightVersionId)
                                    )
                                    : 'Select a version'}
                            </div>
                            <div className="flex-1 min-h-0">
                                <Editor
                                    height="100%"
                                    defaultLanguage="yaml"
                                    value={rightYaml || '# Select a version to view'}
                                    options={{
                                        readOnly: true,
                                        wordWrap: 'on',
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        lineNumbers: 'on',
                                    }}
                                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
