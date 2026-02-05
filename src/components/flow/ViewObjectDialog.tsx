'use client'

import { X } from 'lucide-react'

interface ViewObjectDialogProps {
    open: boolean
    onClose: () => void
    nodeId: string
    values: Record<string, unknown> | undefined
}

export default function ViewObjectDialog({ open, onClose, nodeId, values }: ViewObjectDialogProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-background border border-border rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                    <h2 className="text-sm font-semibold">
                        Object Values
                        <span className="ml-2 text-xs font-normal text-muted-foreground font-mono">{nodeId}</span>
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors cursor-pointer">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 min-h-0">
                    <pre className="text-xs font-mono bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-auto whitespace-pre-wrap break-words">
                        {values ? JSON.stringify(values, null, 2) : 'No values'}
                    </pre>
                </div>
            </div>
        </div>
    )
}
