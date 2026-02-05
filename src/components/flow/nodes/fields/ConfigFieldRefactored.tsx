"use client"

import { Trash } from "lucide-react"
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
    readOnly = false,
    onRemove,
    depth = 0
}: BaseFieldProps) => {
    // Determine field type
    const typeArray = Array.isArray(schema?.type) ? schema?.type : [schema?.type || (Array.isArray(value) ? 'array' : typeof value)]
    const rawValueType = schema?.$ref ? 'objectRef' : typeArray[0] || "string"
    // In kind mode, object/array fields should render as objectRef (handle + "Create node" button)
    const valueType = (mode === 'kind' && (rawValueType === 'object' || rawValueType === 'array'))
        ? 'objectRef'
        : rawValueType
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
                FieldComponent: ConfigFieldRefactored,
                depth
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
                FieldComponent: ConfigFieldRefactored,
                depth
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

    const removeButton = onRemove ? (
        <button
            onClick={onRemove}
            className="shrink-0 order-last ml-auto p-0.5 rounded opacity-0 group-hover/field:opacity-100 cursor-pointer transition-opacity hover:bg-red-50 dark:hover:bg-red-950"
            title="Remove field"
        >
            <Trash className="w-3.5 h-3.5 text-red-500 hover:text-red-700" />
        </button>
    ) : null

    const depthBg = depth % 2 === 0 ? 'bg-background' : 'bg-muted/50'
    const depthBorder = depth > 0 ? 'border border-border' : ''
    const branchTick = depth > 0 ? 'relative before:absolute before:left-[-13px] before:top-1/2 before:w-[12px] before:h-px before:bg-border' : ''

    if (isComplex && isComplexFieldResult(fieldResult)) {
        // For complex types with separate inline/expanded content
        return (
            <div data-field-path={path} className={`${depthBg} ${depthBorder} ${branchTick} rounded ${depth > 0 ? 'p-2' : 'px-1'}`}>
                <div className="group/field relative flex items-center gap-1.5 min-h-8 pl-1">
                    <FieldLabel
                        label={label}
                        schema={schema}
                        isComplex={isComplex}
                    />
                    {fieldResult.inlineContent}
                    {removeButton}
                </div>
                {fieldResult.expandedContent}
            </div>
        )
    } else {
        // For simple types, use the flex row layout
        return (
            <div data-field-path={path} className={`space-y-1 ${depth > 0 ? `${depthBg} ${depthBorder} ${branchTick} rounded p-2` : ''}`}>
                <div className="group/field relative flex items-center gap-2 min-h-8 pl-1">
                    <FieldLabel
                        label={label}
                        schema={schema}
                        isComplex={isComplex}
                    />
                    {fieldResult as React.ReactNode}
                    {removeButton}
                </div>
            </div>
        )
    }
}
