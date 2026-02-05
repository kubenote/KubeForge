"use client"

import { Handle, Position } from "@xyflow/react"
import { memo } from "react"
import NodeContainer from "./flow.container.component"
import {
    KeyRound, Container, FileCode, Globe, Database,
    MessageSquare, ScrollText, Activity, UserCog, Cloud
} from "lucide-react"

const ICON_MAP: Record<string, typeof Cloud> = {
    KeyRound, Container, FileCode, Globe, Database,
    MessageSquare, ScrollText, Activity, UserCog,
}

const TYPE_COLORS: Record<string, string> = {
    'SecretRefNode': 'text-yellow-500 !border-yellow-500',
    'RegistryNode': 'text-blue-500 !border-blue-500',
    'ConfigMapNode': 'text-green-500 !border-green-500',
    'IngressNode': 'text-purple-500 !border-purple-500',
    'DatabaseNode': 'text-cyan-500 !border-cyan-500',
    'MessageQueueNode': 'text-pink-500 !border-pink-500',
    'LoggingSidecarNode': 'text-orange-500 !border-orange-500',
    'MonitoringNode': 'text-emerald-500 !border-emerald-500',
    'ServiceAccountNode': 'text-indigo-500 !border-indigo-500',
}

const TYPE_LABELS: Record<string, string> = {
    'SecretRefNode': 'Secret',
    'RegistryNode': 'Registry',
    'ConfigMapNode': 'ConfigMap',
    'IngressNode': 'Ingress',
    'DatabaseNode': 'Database',
    'MessageQueueNode': 'Queue',
    'LoggingSidecarNode': 'Logging',
    'MonitoringNode': 'Monitoring',
    'ServiceAccountNode': 'ServiceAccount',
}

const TYPE_ICONS: Record<string, string> = {
    'SecretRefNode': 'KeyRound',
    'RegistryNode': 'Container',
    'ConfigMapNode': 'FileCode',
    'IngressNode': 'Globe',
    'DatabaseNode': 'Database',
    'MessageQueueNode': 'MessageSquare',
    'LoggingSidecarNode': 'ScrollText',
    'MonitoringNode': 'Activity',
    'ServiceAccountNode': 'UserCog',
}

const HANDLE_LABELS: Record<string, string> = {
    'SecretRefNode': 'envFrom + secretRef',
    'RegistryNode': 'imagePullSecrets',
    'ConfigMapNode': 'envFrom / volume',
    'IngressNode': 'ingress spec',
    'DatabaseNode': 'env vars',
    'MessageQueueNode': 'env vars',
    'LoggingSidecarNode': 'sidecar + volumes',
    'MonitoringNode': 'annotations',
    'ServiceAccountNode': 'serviceAccountName',
}

export interface IntegrationNodeData {
    type: string
    item: {
        name?: string
        slug?: string
        provider?: string
        sidecar_type?: string
        config: Record<string, unknown>
        [key: string]: unknown
    }
    [key: string]: unknown
}

interface IntegrationNodeProps {
    id: string
    type: string
    data: IntegrationNodeData
}

function IntegrationNodeComponent({ id, type, data }: IntegrationNodeProps) {
    const nodeType = type || data.type || 'SecretRefNode'
    const colorClass = TYPE_COLORS[nodeType] || 'text-gray-500'
    const label = TYPE_LABELS[nodeType] || 'Integration'
    const iconName = TYPE_ICONS[nodeType] || 'Cloud'
    const handleLabel = HANDLE_LABELS[nodeType] || 'integration'
    const Icon = ICON_MAP[iconName] || Cloud

    const item = data.item || { config: {} }
    const config = item.config || {}
    const displayName = (item.name || 'Unnamed') as string
    const provider = (item.provider || item.sidecar_type || '') as string

    return (
        <NodeContainer nodeId={id}>
            <div className="text-sm font-semibold flex items-center gap-2 border-b pb-2 mb-3">
                <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                <span className="truncate">{displayName}</span>
                {provider && (
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {provider}
                    </span>
                )}
            </div>

            {/* Show key config values — always reads from item.config */}
            <div className="space-y-1 text-xs">
                {renderConfigSummary(config, nodeType, item)}
            </div>

            <div className="mt-3 pt-2 border-t">
                <div className="flex items-center relative">
                    <span className={`text-[10px] ${colorClass.split(' ')[0]}`}>
                        {handleLabel}
                    </span>
                    <div className="flex-grow" />
                    <span className={`text-xs mr-2 ${colorClass.split(' ')[0]}`}>{label.toLowerCase()}</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        className={`!w-2 !h-2 !border-2 ${colorClass} !bg-white`}
                        id={`source-${id}`}
                    />
                </div>
            </div>
        </NodeContainer>
    )
}

/**
 * Renders config summary rows. After normalization, all operational
 * fields live in item.config. The `item` param is only used as a
 * fallback for display name fields.
 */
function renderConfigSummary(
    config: Record<string, unknown>,
    nodeType: string,
    item: Record<string, unknown>
) {
    const rows: Array<{ label: string; value: string }> = []

    switch (nodeType) {
        case 'SecretRefNode':
            if (config.secretName) rows.push({ label: 'Secret', value: config.secretName as string })
            break
        case 'RegistryNode':
            if (config.registry_url) rows.push({ label: 'URL', value: config.registry_url as string })
            if (config.secret_name) rows.push({ label: 'Secret', value: config.secret_name as string })
            break
        case 'ConfigMapNode':
            if (config.configMapName) rows.push({ label: 'ConfigMap', value: config.configMapName as string })
            if (config.mountType) rows.push({ label: 'Type', value: config.mountType as string })
            break
        case 'IngressNode':
            if (config.domain) rows.push({ label: 'Domain', value: config.domain as string })
            if (config.ingress_class) rows.push({ label: 'Class', value: config.ingress_class as string })
            break
        case 'DatabaseNode':
            if (config.host) rows.push({ label: 'Host', value: config.host as string })
            if (config.database) rows.push({ label: 'DB', value: config.database as string })
            break
        case 'MessageQueueNode':
            if (config.host || config.queueUrl || config.brokers || config.url) {
                rows.push({ label: 'Endpoint', value: (config.host || config.queueUrl || config.brokers || config.url) as string })
            }
            break
        case 'LoggingSidecarNode':
            if (config.image) rows.push({ label: 'Image', value: config.image as string })
            break
        case 'MonitoringNode':
            if (config.scrapePort) rows.push({ label: 'Port', value: config.scrapePort as string })
            if (config.scrapePath) rows.push({ label: 'Path', value: config.scrapePath as string })
            break
        case 'ServiceAccountNode':
            if (config.serviceAccountName) rows.push({ label: 'SA', value: config.serviceAccountName as string })
            break
    }

    return rows.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-2">
            <span className="text-muted-foreground w-16 shrink-0">{label}</span>
            <span className="font-mono text-foreground truncate">{value}</span>
        </div>
    ))
}

export const IntegrationNode = memo(
    IntegrationNodeComponent,
    (prev, next) => JSON.stringify(prev.data) === JSON.stringify(next.data) && prev.type === next.type
)

// Export individual node types as aliases for the nodeTypes registry
export const SecretRefNode = IntegrationNode
export const RegistryNode = IntegrationNode
export const ConfigMapNode = IntegrationNode
export const IngressNode = IntegrationNode
export const DatabaseNode = IntegrationNode
export const MessageQueueNode = IntegrationNode
export const LoggingSidecarNode = IntegrationNode
export const MonitoringNode = IntegrationNode
export const ServiceAccountNode = IntegrationNode
