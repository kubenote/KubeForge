import { ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface BaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export function BaseDialog({ 
    open, 
    onOpenChange, 
    title, 
    description, 
    children, 
    className = "",
    maxWidth = "4xl"
}: BaseDialogProps) {
    const maxWidthClass = `sm:max-w-${maxWidth}`;
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${maxWidthClass} ${className}`}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <DialogDescription>{description}</DialogDescription>
                    )}
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}