import React, { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

interface ContextMenuProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string;
    top: number;
    left: number;
    right?: number;
    bottom?: number;
}

export default function ContextMenu({
    id,
    top,
    left,
    right,
    bottom,
    ...props
}: ContextMenuProps) {
    const { getNode, setNodes, setEdges } = useReactFlow();



    const deleteNode = useCallback(() => {
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
        setEdges((edges) => edges.filter((edge) => edge.source !== id));
    }, [id, setNodes, setEdges]);



    return (
        <div
            style={{ top, left, right, bottom }}
            className="absolute z-10 bg-white border border-gray-300 shadow-lg rounded-md text-sm"
            {...props}
        >
            <p className="px-3 py-2 text-xs text-muted-foreground">
                node: <span className="font-mono text-[11px]">{id}</span>
            </p>
            <button
                onClick={() => {
                    const node = getNode(id);
                    const values = node?.data?.values;
                    console.log("🧩 Node values:", values);
                    alert(JSON.stringify(values, null, 2)); // or open a drawer/modal
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 transition"
            >
                View Object
            </button>

            <button
                onClick={deleteNode}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 transition"
            >
                Delete
            </button>
        </div>
    );
}
