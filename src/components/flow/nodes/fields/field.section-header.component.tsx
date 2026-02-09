"use client"

import { ChevronDown, ChevronRight, Lock } from "lucide-react"
import { CLASSIFICATION_META, type FieldClassification } from "@/lib/schema/fieldClassification"

interface FieldSectionHeaderProps {
    classification: FieldClassification
    fieldCount: number
    expanded: boolean
    onToggle: () => void
    isFirst?: boolean
}

export const FieldSectionHeader = ({
    classification,
    fieldCount,
    expanded,
    onToggle,
    isFirst = false,
}: FieldSectionHeaderProps) => {
    const meta = CLASSIFICATION_META[classification]

    return (
        <div className={`${isFirst ? '' : 'border-t border-border mt-2 pt-1.5'}`}>
            <button
                onClick={onToggle}
                className="flex items-center gap-1.5 w-full text-left py-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 transition-colors"
            >
                {classification === 'readOnly' ? (
                    <Lock className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                ) : (
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${meta.dotColor} shrink-0`} />
                )}
                <span className={`text-[10px] font-medium ${meta.colorClass}`}>
                    {meta.label}
                </span>
                <span className="text-[9px] text-muted-foreground/60 bg-muted rounded-full px-1.5 py-px">
                    {fieldCount}
                </span>
                <span className="ml-auto">
                    {expanded ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                    ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                    )}
                </span>
            </button>
        </div>
    )
}
