"use client"

import { Handle, Position, useReactFlow } from "@xyflow/react"
import { useState, useCallback, useEffect, memo } from "react"
import NodeContainer from "./flow.container.component"
import { Database, Cloud, HardDrive } from "lucide-react"
import { useReadOnly } from "@/contexts/ReadOnlyContext"

const PROVIDER_ICONS: Record<string, { icon: typeof Cloud; color: string }> = {
    'aws-s3': { icon: Cloud, color: 'text-orange-500' },
    'oci': { icon: Database, color: 'text-red-500' },
    'gcs': { icon: Cloud, color: 'text-blue-500' },
    'azure-blob': { icon: Cloud, color: 'text-cyan-500' },
    'minio': { icon: HardDrive, color: 'text-gray-500' },
}

const PROVIDER_LABELS: Record<string, string> = {
    'aws-s3': 'AWS S3',
    'oci': 'OCI',
    'gcs': 'GCS',
    'azure-blob': 'Azure Blob',
    'minio': 'MinIO',
}

interface StorageBucketNodeProps {
    id: string
    data: {
        type: 'StorageBucket'
        item: {
            name: string
            slug: string
            provider: string
            config: Record<string, unknown>
        }
        mountPath: string
        readOnly: boolean
        volumeName: string
    }
}

function StorageBucketNodeComponent({ id, data }: StorageBucketNodeProps) {
    const [mountPath, setMountPath] = useState(data.mountPath || '/mnt/data')
    const [isReadOnlyMount, setIsReadOnlyMount] = useState(data.readOnly || false)
    const { setNodes } = useReactFlow()
    const { isReadOnly } = useReadOnly()

    const provider = data.item?.provider || 'aws-s3'
    const providerInfo = PROVIDER_ICONS[provider] || PROVIDER_ICONS['aws-s3']
    const ProviderIcon = providerInfo.icon

    // Sync state changes back to node data (export resolver reads these at export time)
    useEffect(() => {
        if (isReadOnly) return

        const updatedData = {
            ...data,
            mountPath,
            readOnly: isReadOnlyMount,
        }

        setNodes((prevNodes) =>
            prevNodes.map((node) => {
                if (node.id !== id) return node
                return { ...node, data: updatedData }
            })
        )
    }, [mountPath, isReadOnlyMount, isReadOnly])

    const handleMountPathChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMountPath(e.target.value)
    }, [])

    return (
        <NodeContainer nodeId={id}>
            {/* Header */}
            <div className="text-sm font-semibold flex items-center gap-2 border-b pb-2 mb-3">
                <ProviderIcon className={`w-4 h-4 ${providerInfo.color}`} />
                <span className="truncate">{data.item?.name || 'Storage Bucket'}</span>
                <span className="ml-auto text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {PROVIDER_LABELS[provider] || provider}
                </span>
            </div>

            {/* Volume name (read-only, derived from slug) */}
            <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Volume</span>
                    <span className="font-mono text-foreground">{data.volumeName}</span>
                </div>

                {/* Mount path (editable) */}
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Mount Path</span>
                    <input
                        type="text"
                        value={mountPath}
                        onChange={handleMountPathChange}
                        disabled={isReadOnly}
                        className="flex-1 bg-muted/50 border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                        placeholder="/mnt/data"
                    />
                </div>

                {/* Read-only toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Read Only</span>
                    <button
                        onClick={() => !isReadOnly && setIsReadOnlyMount(!isReadOnlyMount)}
                        disabled={isReadOnly}
                        className={`w-8 h-4 rounded-full transition-colors relative ${isReadOnlyMount ? 'bg-amber-500' : 'bg-muted-foreground/30'} disabled:opacity-50`}
                    >
                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${isReadOnlyMount ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                </div>
            </div>

            {/* Single source handle — connect to any spec node to inject volumes + volumeMounts */}
            <div className="mt-3 pt-2 border-t">
                <div className="flex items-center relative">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                        volumes + volumeMounts
                    </span>
                    <div className="flex-grow" />
                    <span className="text-xs mr-2 text-amber-500">storage</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        className="!w-2 !h-2 !border-2 !border-amber-500 !bg-white"
                        id={`source-${id}`}
                    />
                </div>
            </div>
        </NodeContainer>
    )
}

export const StorageBucketNode = memo(
    StorageBucketNodeComponent,
    (prev, next) => JSON.stringify(prev.data) === JSON.stringify(next.data)
)
