"use client"

import { Lock } from "lucide-react"
import type { FieldClassification } from "@/lib/schema/fieldClassification"

interface ClassificationIndicatorProps {
    classification: FieldClassification
}

export const ClassificationIndicator = ({ classification }: ClassificationIndicatorProps) => {
    switch (classification) {
        case 'required':
            return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        case 'recommended':
            return <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        case 'readOnly':
            return <Lock className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
        default:
            return null
    }
}
