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
import { Schema, GVK } from "@/types";

interface SchemaInfoObject {
    name: string | GVK;
    data: Schema | undefined;
}

interface SchemaInfoDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    loadObject: SchemaInfoObject | Record<string, never>;
}

export function SchemaInfoDialog({
    isOpen,
    onOpenChange,
    loadObject
}: SchemaInfoDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>
                        {typeof loadObject?.name === 'string'
                            ? loadObject.name
                            : loadObject?.name?.kind}
                    </DialogTitle>
                    <DialogDescription>
                        Schema details
                    </DialogDescription>
                </DialogHeader>
                <MonacoComponent jsonData={loadObject?.data} />
            </DialogContent>
        </Dialog>
    );
}