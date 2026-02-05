"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Schema } from "@/types"

interface FieldLabelProps {
    label: string
    schema: Schema
    isComplex?: boolean
}

export const FieldLabel = ({ label, schema, isComplex = false }: FieldLabelProps) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className={`text-xs text-muted-foreground shrink-0 ${isComplex ? 'order-1' : ''}`}>
                    {label}
                </span>
            </TooltipTrigger>
            {schema?.description && (
                <TooltipContent className="max-w-xs">
                    {schema.description}
                </TooltipContent>
            )}
        </Tooltip>
    )
}
