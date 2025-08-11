import { Handle, Position } from "@xyflow/react";
import { getTypeColor, ValueType } from "./nodes/flow.node.types";

interface TypedHandleProps {
    type: "source" | "target";
    position: Position;
    id: string;
    valueType: string;
    className?: string;
}

export function TypedHandle({ 
    type, 
    position, 
    id, 
    valueType, 
    className = "" 
}: TypedHandleProps) {
    const baseClasses = "!w-2 !h-2 !border-2 !bg-white";
    const typeColorClass = getTypeColor(valueType);
    
    return (
        <Handle
            type={type}
            position={position}
            className={`${baseClasses} ${typeColorClass} ${className}`}
            id={id}
        />
    );
}