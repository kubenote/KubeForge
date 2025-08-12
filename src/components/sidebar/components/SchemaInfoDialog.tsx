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

interface SchemaInfoDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    loadObject: any;
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
                    <DialogTitle>{loadObject?.name}</DialogTitle>
                    <DialogDescription>
                        This is more info about <strong>{"item"}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <MonacoComponent jsonData={loadObject?.data} />
            </DialogContent>
        </Dialog>
    );
}