"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import MonacoComponent from "./monaco.component";
import { useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Input } from "../ui/input";
import { LinkIcon } from "lucide-react";

export default function ExportDialog() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [exportData, setExportData] = useState({});
    const [generated, setGenerated] = useState("")
    const { getNodes } = useReactFlow();
    const monacoRef = useRef(null);
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
        monacoRef.current?.downloadYaml(); // 👈 call method exposed via ref
    };

    const triggerGenerate = async () => {
        const generatedUrl = await monacoRef.current?.uploadYamlToServer();
        setGenerated(generatedUrl);
    }

    const resetState = (state) => {
        if (!state) {
            setGenerated("")
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
                    >Generate URL</Button>
                </div>
                {generated && (<div className="relative flex"><Input disabled value={origin + generated} /><LinkIcon onClick={() => { window.open(origin + generated, '_blank'); }} className="absolute right-3 top-3 text-blue-700 cursor-pointer" size={14} /></div>)}
            </DialogContent>

        </Dialog>
    );
}
