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
    const { addNode } = useNodeProvider()
    const { isConnected, targetHandleId } = useFieldConnection({
        edges,
        nodeId,
        label,
        valueType,
        path,
        onChange
    })

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
                    className={`!w-2 !h-2 !border-2 ${getTypeColor(valueType)} !bg-white`}
                    id={targetHandleId}
                />
            )}

            <span className={`text-xs ml-2 ${getTypeColor(valueType)}`}>
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
                    <Input
                        className="ml-2 h-6 px-2 py-0 text-xs rounded-sm disabled:bg-[#e0e0e0] disabled:border-[#bdbdbd]"
                        value={inputValue}
                        onChange={!isConnected && !readOnly ? handleChange : undefined}
                        disabled={isConnected || readOnly}
                    />
                )
            ) : (
                mode === 'kind' && !isConnected && (
                    <button 
                        onClick={handleCreateObjectRef}
                        className="ml-2 h-6 px-2 py-0 text-xs rounded-sm border cursor-pointer ml-auto bg-gray-100 hover:bg-gray-200"
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