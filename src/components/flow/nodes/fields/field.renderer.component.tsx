"use client"

import { BaseFieldProps } from "./field.types"
import { Schema } from "@/types"

// Forward declaration for recursive rendering
interface FieldRendererProps extends BaseFieldProps {}

export const FieldRenderer = ({ 
    label, 
    value, 
    schema, 
    path, 
    nodeId, 
    edges,
    mode = 'kind',
    readOnly = false,
    kind,
    onChange
}: FieldRendererProps) => {
    // Import the refactored component dynamically to avoid circular imports
    const { ConfigFieldRefactored } = require('./field.config-refactored.component')
    
    return (
        <ConfigFieldRefactored
            label={label}
            value={value}
            schema={schema}
            path={path}
            onChange={onChange}
            nodeId={nodeId}
            kind={kind}
            edges={edges}
            mode={mode}
            readOnly={readOnly}
        />
    )
}