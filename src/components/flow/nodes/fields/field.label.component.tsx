"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Schema } from "@/types"
import type { FieldClassification } from "@/lib/schema/fieldClassification"
import { getFieldEducation } from "@/lib/schema/fieldClassification"
import { ClassificationIndicator } from "./field.classification-indicator.component"

interface FieldLabelProps {
    label: string
    schema: Schema
    isComplex?: boolean
    classification?: FieldClassification
    kind?: string
    parentPath?: string
}

export const FieldLabel = ({ label, schema, isComplex = false, classification, kind, parentPath }: FieldLabelProps) => {
    const education = kind && classification === 'recommended' ? getFieldEducation(label, kind, parentPath) : null
    const hasTooltipContent = schema?.description || education

    const dimClass = classification === 'optional'
        ? 'text-muted-foreground/50'
        : classification === 'readOnly'
            ? 'text-muted-foreground/50 italic'
            : 'text-muted-foreground'

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className={`inline-flex items-center gap-1 text-xs ${dimClass} shrink-0 ${isComplex ? 'order-1' : ''}`}>
                    {label}
                    {classification && <ClassificationIndicator classification={classification} />}
                </span>
            </TooltipTrigger>
            {hasTooltipContent && (
                <TooltipContent className="max-w-xs">
                    <div className="space-y-1.5">
                        {schema?.description && <p>{schema.description}</p>}
                        {education && (
                            <div className="border-t border-border pt-1.5">
                                <p className="text-amber-500 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Why this matters</p>
                                <p className="text-xs">{education}</p>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            )}
        </Tooltip>
    )
}
