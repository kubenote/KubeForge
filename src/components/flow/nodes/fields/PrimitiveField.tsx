"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Handle, Position } from "@xyflow/react"
import { publish } from "@/lib/eventBus"
import { getTypeColor } from "../flow.node.types"
import { useNodeProvider } from "@/providers/NodeProvider"
import { BaseFieldProps } from "./types"
import { useFieldConnection } from "./useFieldConnection"
import { validateField, ValidationError } from "@/lib/validation"

interface PrimitiveFieldProps extends BaseFieldProps {
    valueType: string
}

export const PrimitiveField = ({
    label,
    value,
    schema,
    path,
    nodeId,
    edges,
    mode = 'kind',
    readOnly = false,
    kind,
    onChange,
    valueType
}: PrimitiveFieldProps) => {
    const [inputValue, setInputValue] = useState(String(value ?? ""))
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
    const { addNode } = useNodeProvider()
    const { isConnected, targetHandleId } = useFieldConnection({
        edges,
        nodeId,
        label,
        valueType,
        path,
        onChange
    })

    // Validate on value change
    const runValidation = (val: unknown) => {
        const errors = validateField(val, schema, path, valueType)
        setValidationErrors(errors)
    }

    // Update input value when the value prop changes
    useEffect(() => {
        setInputValue(String(value ?? ""))
    }, [value, nodeId])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newInputValue = e.target.value
        setInputValue(newInputValue)
        const parsedValue = valueType === "number" || valueType === "integer"
            ? Number(newInputValue)
            : newInputValue
        onChange(path, parsedValue)

        const selfId = `${nodeId}.${label}`
        publish(selfId, parsedValue)
    }

    const handleBlur = () => {
        runValidation(inputValue)
    }

    const hasErrors = validationErrors.length > 0

    const handleBooleanChange = (checked: boolean | "indeterminate") => {
        const boolValue = checked === true
        onChange(path, boolValue)

        const selfId = `${nodeId}.${label}`
        publish(selfId, boolValue)
    }

    const handleCreateObjectRef = () => {
        if (!kind) return
        addNode({ 
            targetNode: nodeId, 
            data: { nodeId: nodeId, kind: kind, objectRef: label }, 
            type: 'ObjectRefNode' 
        })
    }

    return (
        <>
            {mode === 'kind' && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className={`!w-2 !h-2 !border-2 !-ml-1 ${getTypeColor(valueType)} !bg-white`}
                    id={targetHandleId}
                />
            )}

            <span className={`text-xs ml-4 ${getTypeColor(valueType)}`}>
                {valueType}
            </span>
            
            {valueType !== "objectRef" ? (
                valueType === "boolean" && mode === 'objectRef' ? (
                    <div className="flex w-full pr-8">
                        <div className="flex-grow" />
                        <Checkbox
                            checked={Boolean(value)}
                            onCheckedChange={readOnly ? undefined : handleBooleanChange}
                            disabled={readOnly}
                        />
                    </div>
                ) : (
                    <div className="flex-1 ml-2">
                        <Input
                            className={`h-6 px-2 py-0 text-xs rounded-sm disabled:bg-muted disabled:border-muted-foreground/30 ${
                                hasErrors ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                            }`}
                            value={inputValue}
                            onChange={!isConnected && !readOnly ? handleChange : undefined}
                            onBlur={handleBlur}
                            disabled={isConnected || readOnly}
                        />
                        {hasErrors && (
                            <div className="text-[10px] text-red-500 mt-0.5 leading-tight">
                                {validationErrors[0].message}
                            </div>
                        )}
                    </div>
                )
            ) : (
                mode === 'kind' && !isConnected && (
                    <button
                        onClick={handleCreateObjectRef}
                        className="ml-2 h-6 px-2 py-0 text-xs rounded-sm border cursor-pointer ml-auto bg-muted hover:bg-muted/80"
                    >
                        Create {label} node
                    </button>
                )
            )}

            {valueType !== "objectRef" && mode === 'kind' && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className={`!w-2 !h-2 !border-2 ${getTypeColor(valueType)} !bg-white`}
                    id={`source-${label}`}
                />
            )}
        </>
    )
}