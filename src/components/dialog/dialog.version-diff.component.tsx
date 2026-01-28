'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import { ProjectDataService, ProjectVersion } from '@/services/project.data.service';
import yaml from 'js-yaml';
import Editor from '@monaco-editor/react';

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

/**
 * Convert nodes to YAML for comparison (similar to export logic)
 */
function nodesToYaml(nodes: Node[], edges: Edge[]): string {
    const nodeValuesMap = Object.fromEntries(
        nodes.map((n) => [n.id, n.data?.values || {}])
    );

    // Create a map of connected ObjectRef nodes
    const connectedRefs = new Set<string>();
    edges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === 'ObjectRefNode') {
            connectedRefs.add(edge.source);
        }
    });

    const resolveRefs = (value: unknown): unknown => {
        if (Array.isArray(value)) {
            return value.map(resolveRefs);
        } else if (typeof value === 'object' && value !== null) {
            return Object.fromEntries(
                Object.entries(value).map(([k, v]) => [k, resolveRefs(v)])
            );
        } else if (typeof value === 'string' && value.startsWith('#ref-')) {
            const refNodeId = value.slice(5);
            if (connectedRefs.has(refNodeId)) {
                return nodeValuesMap[refNodeId] || {};
            }
            return {};
        }
        return value;
    };

    const data = nodes
        .filter((node) => node.type !== 'ObjectRefNode')
        .map((node) => {
            const resolved = resolveRefs(structuredClone(node.data?.values || {}));
            return resolved;
        });

    try {
        if (Array.isArray(data)) {
            return data.map((doc) => yaml.dump(doc)).join('\n---\n');
        }
        return yaml.dump(data);
    } catch (e) {
        return '# Error converting to YAML:\n' + (e instanceof Error ? e.message : String(e));
    }
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
            const yamlContent = nodesToYaml(versionData.nodes, versionData.edges);
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

    // Reset state when dialog opens
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={versions.length < 2}
                    title={versions.length < 2 ? 'Need at least 2 versions to compare' : 'Compare versions'}
                >
                    <GitCompare className="w-4 h-4 mr-1" />
                    Compare
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[100vw] h-[100vh] max-w-[100vw] max-h-[100vh] rounded-none flex flex-col">
                <DialogHeader>
                    <DialogTitle>Compare Versions - {projectName}</DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 mb-4">
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
                    <div className="text-center py-4 text-muted-foreground">
                        Loading versions...
                    </div>
                )}

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
                                theme="vs-dark"
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
                                theme="vs-dark"
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
