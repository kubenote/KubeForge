import React, { useCallback, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWarning } from "../../providers/WarningsProvider";
import ViewObjectDialog from "./ViewObjectDialog";

interface ContextMenuProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string;
    top: number;
    left: number;
    right?: number;
    bottom?: number;
    onOpenWarnings?: () => void;
}

export default function ContextMenu({
    id,
    top,
    left,
    right,
    bottom,
    onOpenWarnings,
    ...props
}: ContextMenuProps) {
    const { getNode, setNodes, setEdges } = useReactFlow();
    const { setFilterNodeId } = useWarning();
    const [viewObjectOpen, setViewObjectOpen] = useState(false);
    const [viewObjectValues, setViewObjectValues] = useState<Record<string, unknown> | undefined>(undefined);

    const deleteNode = useCallback(() => {
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
        setEdges((edges) => edges.filter((edge) => edge.source !== id));
    }, [id, setNodes, setEdges]);

    const handleViewObject = useCallback(() => {
        const node = getNode(id);
        setViewObjectValues(node?.data?.values as Record<string, unknown> | undefined);
        setViewObjectOpen(true);
    }, [id, getNode]);

    const handleViewIssues = useCallback(() => {
        setFilterNodeId(id);
        onOpenWarnings?.();
    }, [id, setFilterNodeId, onOpenWarnings]);

    return (
        <>
            <div
                style={{ top, left, right, bottom }}
                className="absolute z-10 bg-popover border border-border shadow-lg rounded-xl text-sm min-w-[160px]"
                {...props}
            >
                <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                    node: <span className="font-mono text-[11px]">{id}</span>
                </p>
                <div className="py-1">
                    <button
                        onClick={handleViewObject}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand-muted hover:text-brand transition-colors cursor-pointer"
                    >
                        View Object
                    </button>
                    <button
                        onClick={handleViewIssues}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand-muted hover:text-brand transition-colors cursor-pointer"
                    >
                        View Issues
                    </button>
                    <button
                        onClick={deleteNode}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                        Delete
                    </button>
                </div>
            </div>
            <ViewObjectDialog
                open={viewObjectOpen}
                onClose={() => setViewObjectOpen(false)}
                nodeId={id}
                values={viewObjectValues}
            />
        </>
    );
}
