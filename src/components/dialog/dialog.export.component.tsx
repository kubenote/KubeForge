"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import MonacoComponent from "./dialog.monaco.component";
import { useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Input } from "../ui/input";
import { LinkIcon } from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";

type MonacoComponentHandle = {
    downloadYaml: () => void;
    uploadYamlToServer: () => Promise<string>;
};


export default function ExportDialog() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [exportData, setExportData] = useState({});
    const [generated, setGenerated] = useState("")
    const [error, setError] = useState("")
    const { getNodes } = useReactFlow();
    const { isDemoMode } = useDemoMode();
    const monacoRef = useRef<MonacoComponentHandle>(null);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';



    const prepDialog = () => {
        const nodes = getNodes();

        const nodeValuesMap = Object.fromEntries(
            nodes.map((n) => [n.id, n.data?.values || {}])
        );

        const resolveRefs = (value: any): any => {
            if (Array.isArray(value)) {
                return value.map(resolveRefs);
            } else if (typeof value === "object" && value !== null) {
                return Object.fromEntries(
                    Object.entries(value).map(([k, v]) => [k, resolveRefs(v)])
                );
            } else if (typeof value === "string" && value.startsWith("#ref-")) {
                const refNodeId = value.slice(5); // everything after "#ref-"
                return nodeValuesMap[refNodeId] || {};
            }
            return value;
        };

        const data = nodes
            .filter((node) => node.type !== "ObjectRefNode")
            .map((node) => {
                const resolved = resolveRefs(structuredClone(node.data?.values || {}));
                return resolved;
            });

        console.log("Exporting data:", data);
        setExportData(data);
        setDialogOpen(true);
    };


    const triggerDownload = () => {
        monacoRef.current?.downloadYaml();
    };

    const triggerGenerate = async () => {
        // Block URL generation in demo mode
        if (isDemoMode) {
            setError("URL generation is disabled in demo mode");
            return;
        }

        setError(""); // Clear any previous errors
        const generatedUrl = await monacoRef.current?.uploadYamlToServer();
        setGenerated(generatedUrl || "");
    }

    const resetState = (state: boolean) => {
        if (!state) {
            setGenerated("")
            setError("")
        }
        setDialogOpen(state)
    }


    return (
        <Dialog open={dialogOpen} onOpenChange={resetState}>
            <Button variant="outline" className="mr-4" onClick={prepDialog}>
                Export
            </Button>

            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>YAML Export</DialogTitle>
                    <DialogDescription>
                        This is more info about <strong>your nodes</strong>.
                    </DialogDescription>
                </DialogHeader>
                <MonacoComponent ref={monacoRef} jsonData={exportData} isK8s />
                <div className="flex gap-4">
                    <Button
                        variant="default"
                        onClick={triggerDownload}
                    >Download</Button>
                    <Button
                        variant="outline"
                        onClick={triggerGenerate}
                        disabled={isDemoMode}
                        title={isDemoMode ? "URL generation is disabled in demo mode" : "Generate shareable URL"}
                    >Generate URL</Button>
                </div>
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}
                {generated && (<div className="relative flex"><Input disabled value={origin + generated} /><LinkIcon onClick={() => { window.open(origin + generated, '_blank'); }} className="absolute right-3 top-3 text-blue-700 cursor-pointer" size={14} /></div>)}
            </DialogContent>

        </Dialog>
    );
}
