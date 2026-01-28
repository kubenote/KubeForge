'use client';

import { AutoSaveStatus } from '@/hooks/useAutoSave';
import { Loader2, Check, AlertCircle, Cloud, CloudOff } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface AutoSaveIndicatorProps {
    status: AutoSaveStatus;
    lastSaved: Date | null;
    error: string | null;
    className?: string;
}

function formatLastSaved(date: Date | null): string {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return `${diffHours}h ago`;
}

export function AutoSaveIndicator({
    status,
    lastSaved,
    error,
    className = '',
}: AutoSaveIndicatorProps) {
    const getStatusIcon = () => {
        switch (status) {
            case 'saving':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'saved':
                return <Check className="h-4 w-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'pending':
                return <Cloud className="h-4 w-4 text-gray-400" />;
            default:
                return <Cloud className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'saving':
                return 'Saving...';
            case 'saved':
                return 'Saved';
            case 'error':
                return 'Error';
            case 'pending':
                return 'Unsaved changes';
            default:
                return lastSaved ? formatLastSaved(lastSaved) : '';
        }
    };

    const getTooltipText = () => {
        switch (status) {
            case 'saving':
                return 'Auto-saving your changes...';
            case 'saved':
                return `Last saved ${formatLastSaved(lastSaved)}`;
            case 'error':
                return error || 'Failed to save. Will retry on next change.';
            case 'pending':
                return 'Changes will be saved automatically';
            default:
                return lastSaved ? `Last saved ${formatLastSaved(lastSaved)}` : 'No unsaved changes';
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            status === 'error'
                                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : status === 'saved'
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : status === 'saving'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        } ${className}`}
                    >
                        {getStatusIcon()}
                        <span>{getStatusText()}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{getTooltipText()}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
