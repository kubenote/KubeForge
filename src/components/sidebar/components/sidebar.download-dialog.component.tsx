'use client';

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface DownloadDialogProps {
    isOpen: boolean;
    downloadingVersion: string | null;
    progress: number;
}

export function DownloadDialog({
    isOpen,
    downloadingVersion,
    progress
}: DownloadDialogProps) {
    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Downloading Kubernetes Schema</DialogTitle>
                    <DialogDescription>
                        Fetching and extracting schemas for <strong>{downloadingVersion ?? "v1.33.3"}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                    <Progress value={progress} className="animate-pulse" />
                </div>
            </DialogContent>
        </Dialog>
    );
}