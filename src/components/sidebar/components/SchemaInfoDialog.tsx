'use client';

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import MonacoComponent from "../../dialog/dialog.monaco.component";
import { GVK } from "@/types";
import { Loader2 } from "lucide-react";
import { fetchSchemas } from "@/lib/schema/schemaFetchService";

interface SchemaInfoDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    kind: string | null;
    gvk: GVK | null;
    version: string;
}

export function SchemaInfoDialog({
    isOpen,
    onOpenChange,
    kind,
    gvk,
    version,
}: SchemaInfoDialogProps) {
    const [schemaData, setSchemaData] = React.useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const displayName = kind || gvk?.kind || '';
    const groupVersion = gvk ? `${gvk.group ? gvk.group + '/' : ''}${gvk.version}` : '';

    React.useEffect(() => {
        if (!isOpen || !displayName || !version) return;

        setLoading(true);
        setError(null);
        setSchemaData(null);

        fetchSchemas(version, [displayName.toLowerCase()], false)
            .then(parsed => {
                if (parsed && typeof parsed === 'object') {
                    const values = Object.values(parsed);
                    if (values.length > 0) {
                        setSchemaData(values[0] as Record<string, unknown>);
                    } else {
                        setError('No schema data found');
                    }
                } else {
                    setError('No schema data found');
                }
            })
            .catch(() => setError('Failed to load schema'))
            .finally(() => setLoading(false));
    }, [isOpen, displayName, version]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{displayName}</DialogTitle>
                    <DialogDescription>
                        {groupVersion ? `${groupVersion} — Schema reference` : 'Schema reference'}
                    </DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center h-[400px]">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
                        {error}
                    </div>
                ) : (
                    <MonacoComponent jsonData={schemaData} />
                )}
            </DialogContent>
        </Dialog>
    );
}
