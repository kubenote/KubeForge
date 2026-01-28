"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Input } from "../ui/input";
import { LinkIcon, FileJson, FileText, FolderArchive } from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Editor from "@monaco-editor/react";
import {
    ExportFormat,
    exportToYaml,
    exportToJson,
    exportToKustomize,
    downloadFile,
    resolveNodeValues,
} from "@/lib/export";
import { useTheme } from "@/contexts/ThemeContext";

interface ExportDialogProps {
    projectId?: string | null;
}

export default function ExportDialog({ projectId }: ExportDialogProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<ExportFormat>("yaml");
    const [previewContent, setPreviewContent] = useState("");
    const [generated, setGenerated] = useState("");
    const [error, setError] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const { getNodes, getEdges } = useReactFlow();
    const { isDemoMode } = useDemoMode();
    const { resolvedTheme } = useTheme();
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const prepDialog = () => {
        const nodes = getNodes();
        const edges = getEdges();
        updatePreview("yaml", nodes, edges);
        setExportFormat("yaml");
        setDialogOpen(true);
    };

    const updatePreview = (format: ExportFormat, nodes = getNodes(), edges = getEdges()) => {
        if (format === "kustomize") {
            // For kustomize, show a preview of what will be generated
            const data = resolveNodeValues(nodes, edges);
            const preview = `# Kustomize Export Preview
# This will create a ZIP file containing:

# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
${data.map((r) => {
    const kind = ((r as Record<string, unknown>).kind as string || "resource").toLowerCase();
    const metadata = (r as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
    const name = (metadata?.name as string || "unnamed").toLowerCase();
    return `  - ${kind}-${name}.yaml`;
}).join("\n")}

# Plus individual resource files for each Kubernetes object`;
            setPreviewContent(preview);
        } else if (format === "json") {
            setPreviewContent(exportToJson(nodes, edges));
        } else {
            setPreviewContent(exportToYaml(nodes, edges));
        }
    };

    const handleFormatChange = (format: ExportFormat) => {
        setExportFormat(format);
        updatePreview(format);
    };

    const triggerDownload = async () => {
        const nodes = getNodes();
        const edges = getEdges();

        if (exportFormat === "kustomize") {
            try {
                const zipBlob = await exportToKustomize(nodes, edges);
                downloadFile(zipBlob, "kubernetes-kustomize.zip");
            } catch (e) {
                setError("Failed to generate Kustomize export");
                console.error(e);
            }
        } else if (exportFormat === "json") {
            const content = exportToJson(nodes, edges);
            downloadFile(content, "kubernetes-resources.json");
        } else {
            const content = exportToYaml(nodes, edges);
            downloadFile(content, "kubernetes-resources.yaml");
        }
    };

    const triggerGenerate = async () => {
        // Block URL generation in demo mode
        if (isDemoMode) {
            setError("URL generation is disabled in demo mode");
            return;
        }

        if (exportFormat === "kustomize") {
            setError("URL generation is not available for Kustomize format");
            return;
        }

        setError("");
        setIsGenerating(true);

        try {
            const nodes = getNodes();
            const edges = getEdges();
            const yamlContent = exportToYaml(nodes, edges);

            const res = await fetch("/api/yaml/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    yamlContent,
                    projectId: projectId || undefined,
                }),
            });

            const result = await res.json();
            if (res.ok) {
                setGenerated(result.url);
            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to generate URL");
        } finally {
            setIsGenerating(false);
        }
    };

    const resetState = (state: boolean) => {
        if (!state) {
            setGenerated("");
            setError("");
            setPreviewContent("");
        }
        setDialogOpen(state);
    };

    const getFormatIcon = (format: ExportFormat) => {
        switch (format) {
            case "json":
                return <FileJson className="w-4 h-4" />;
            case "kustomize":
                return <FolderArchive className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={resetState}>
            <Button variant="outline" className="mr-4" onClick={prepDialog}>
                Export
            </Button>

            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Export Resources</DialogTitle>
                    <DialogDescription>
                        Export your Kubernetes resources in different formats.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm font-medium">Format:</label>
                    <Select value={exportFormat} onValueChange={(v) => handleFormatChange(v as ExportFormat)}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="yaml">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    YAML
                                </div>
                            </SelectItem>
                            <SelectItem value="json">
                                <div className="flex items-center gap-2">
                                    <FileJson className="w-4 h-4" />
                                    JSON
                                </div>
                            </SelectItem>
                            <SelectItem value="kustomize">
                                <div className="flex items-center gap-2">
                                    <FolderArchive className="w-4 h-4" />
                                    Kustomize (ZIP)
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Editor
                    height="400px"
                    defaultLanguage={exportFormat === "json" ? "json" : "yaml"}
                    language={exportFormat === "json" ? "json" : "yaml"}
                    value={previewContent}
                    theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                    options={{
                        readOnly: true,
                        wordWrap: "on",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                    }}
                />

                <div className="flex gap-4">
                    <Button variant="default" onClick={triggerDownload}>
                        {getFormatIcon(exportFormat)}
                        <span className="ml-2">
                            Download {exportFormat === "kustomize" ? "ZIP" : exportFormat.toUpperCase()}
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={triggerGenerate}
                        disabled={isDemoMode || exportFormat === "kustomize" || isGenerating}
                        title={
                            isDemoMode
                                ? "URL generation is disabled in demo mode"
                                : exportFormat === "kustomize"
                                ? "Not available for Kustomize"
                                : "Generate shareable URL"
                        }
                    >
                        {isGenerating ? "Generating..." : "Generate URL"}
                    </Button>
                </div>

                {error && (
                    <div className="p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                {generated && (
                    <div className="relative flex">
                        <Input disabled value={origin + generated} />
                        <LinkIcon
                            onClick={() => {
                                window.open(origin + generated, "_blank");
                            }}
                            className="absolute right-3 top-3 text-blue-700 cursor-pointer"
                            size={14}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
