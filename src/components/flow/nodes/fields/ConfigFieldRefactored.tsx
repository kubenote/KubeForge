"use client"

import { BaseFieldProps, ComplexFieldResult } from "./types"
import { PrimitiveField } from "./PrimitiveField"
import { ObjectField } from "./ObjectField"
import { ArrayField } from "./ArrayField"
import { FieldLabel } from "./FieldLabel"

export const ConfigFieldRefactored = ({ 
    label, 
    value, 
    schema, 
    path, 
    kind, 
    onChange, 
    nodeId, 
    edges,
    mode = 'kind',
    readOnly = false
}: BaseFieldProps) => {
    // Determine field type
    const typeArray = Array.isArray(schema?.type) ? schema?.type : [schema?.type || typeof value]
    const valueType = schema?.$ref ? 'objectRef' : typeArray[0] || "string"
    const isArray = Array.isArray(value) || valueType === "array"
    const isObject = valueType === "object" && value !== null && !isArray
    const isComplex = isObject || isArray

    const renderField = (): React.ReactNode | ComplexFieldResult => {
        if (isObject) {
            return ObjectField({
                label,
                value,
                schema,
                path,
                nodeId,
                edges,
                mode,
                readOnly,
                kind,
                onChange,
                valueType,
                FieldComponent: ConfigFieldRefactored
            })
        }

        if (isArray) {
            return ArrayField({
                label,
                value,
                schema,
                path,
                nodeId,
                edges,
                mode,
                readOnly,
                kind,
                onChange,
                valueType,
                FieldComponent: ConfigFieldRefactored
            })
        }

        return (
            <PrimitiveField
                label={label}
                value={value}
                schema={schema}
                path={path}
                nodeId={nodeId}
                edges={edges}
                mode={mode}
                readOnly={readOnly}
                kind={kind}
                onChange={onChange}
                valueType={valueType}
            />
        )
    }

    const fieldResult = renderField()
    
    function isComplexFieldResult(result: any): result is ComplexFieldResult {
        return result && typeof result === 'object' && 'inlineContent' in result && 'expandedContent' in result
    }
    
    if (isComplex && isComplexFieldResult(fieldResult)) {
        // For complex types with separate inline/expanded content
        return (
            <div className="pl-2 border-muted space-y-1">
                <div className="relative flex items-center gap-2 min-h-8">
                    <FieldLabel 
                        label={label} 
                        schema={schema} 
                        isComplex={isComplex} 
                    />
                    {fieldResult.inlineContent}
                </div>
                {fieldResult.expandedContent}
            </div>
        )
    } else {
        // For simple types, use the flex row layout
        return (
            <div className="pl-2 border-muted space-y-1">
                <div className="relative flex items-center gap-2 min-h-8">
                    <div className="w-0" />
                    <FieldLabel 
                        label={label} 
                        schema={schema} 
                        isComplex={isComplex} 
                    />
                    {fieldResult as React.ReactNode}
                </div>
            </div>
        )
    }
}