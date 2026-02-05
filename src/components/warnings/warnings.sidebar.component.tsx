'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useStore, useReactFlow } from '@xyflow/react'
import { useWarning } from '../../providers/warnings.provider'
import { Info, AlertTriangle, OctagonAlert, X, Search } from 'lucide-react'
import type { Notification } from '@/types'

type GroupBy = 'type' | 'node' | 'none'
type Tab = 'active' | 'suppressed'

const levelIcon = {
    info: <Info className="text-blue-500 w-4 h-4 shrink-0" />,
    warn: <AlertTriangle className="text-yellow-500 w-4 h-4 shrink-0" />,
    danger: <OctagonAlert className="text-red-500 w-4 h-4 shrink-0" />,
}

const levelOrder = { danger: 0, warn: 1, info: 2 }

function getSuppressionKey(w: Notification): string {
    const nodeId = w.nodes?.[0] ?? 'global'
    return `${nodeId}::${w.ruleId}`
}

interface WarningsSidebarProps {
    onClose: () => void
}

export default function WarningsSidebar({ onClose }: WarningsSidebarProps) {
    const [tab, setTab] = useState<Tab>('active')
    const [groupBy, setGroupBy] = useState<GroupBy>('node')
    const [search, setSearch] = useState('')
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; warning: Notification } | null>(null)
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

    const nodes = useStore((s) => s.nodes)
    const { fitView } = useReactFlow()
    const { notifications, suppressedKeys, suppressWarning, unsuppressWarning, filterNodeId, setFilterNodeId } = useWarning()

    // Pre-filter by node if filterNodeId is set
    const nodeFilteredNotifications = useMemo(() => {
        if (!filterNodeId) return notifications
        return notifications.filter(w => w.nodes?.includes(filterNodeId))
    }, [notifications, filterNodeId])

    // Split into active/suppressed
    const { activeWarnings, suppressedWarnings } = useMemo(() => {
        const active: Notification[] = []
        const suppressed: Notification[] = []
        for (const w of nodeFilteredNotifications) {
            const key = getSuppressionKey(w)
            if (suppressedKeys.has(key)) {
                suppressed.push(w)
            } else {
                active.push(w)
            }
        }
        return { activeWarnings: active, suppressedWarnings: suppressed }
    }, [nodeFilteredNotifications, suppressedKeys])

    // Filter by search
    const currentWarnings = tab === 'active' ? activeWarnings : suppressedWarnings
    const filtered = useMemo(() => {
        if (!search.trim()) return currentWarnings
        const q = search.toLowerCase()
        return currentWarnings.filter(w =>
            w.title.toLowerCase().includes(q) || w.message.toLowerCase().includes(q)
        )
    }, [currentWarnings, search])

    // Group
    const grouped = useMemo(() => {
        const sorted = [...filtered].sort((a, b) =>
            (levelOrder[a.level ?? 'info'] - levelOrder[b.level ?? 'info'])
        )

        if (groupBy === 'none') return [{ key: 'all', label: 'All Warnings', warnings: sorted }]

        if (groupBy === 'type') {
            const groups: Record<string, Notification[]> = {}
            for (const w of sorted) {
                const level = w.level ?? 'info'
                if (!groups[level]) groups[level] = []
                groups[level].push(w)
            }
            const order = ['danger', 'warn', 'info']
            const labels: Record<string, string> = { danger: 'Errors', warn: 'Warnings', info: 'Info' }
            return order
                .filter(l => groups[l]?.length)
                .map(l => ({ key: l, label: labels[l], warnings: groups[l] }))
        }

        // By node
        const groups: Record<string, { label: string; warnings: Notification[] }> = {}
        for (const w of sorted) {
            const nodeId = w.nodes?.[0] ?? 'unknown'
            if (!groups[nodeId]) {
                const node = nodes.find(n => n.id === nodeId)
                const label = node?.data?.kind
                    ? `${(node.data as any).kind} (${(node.data as any).type ?? nodeId})`
                    : nodeId
                groups[nodeId] = { label: label as string, warnings: [] }
            }
            groups[nodeId].warnings.push(w)
        }
        return Object.entries(groups).map(([key, { label, warnings }]) => ({
            key, label, warnings
        }))
    }, [filtered, groupBy, nodes])

    const navigateToWarning = useCallback((w: Notification) => {
        const nodeId = w.nodes?.[0]
        if (!nodeId) return
        fitView({ nodes: [{ id: nodeId }], duration: 400, padding: 0.3 })

        if (w.fieldPath) {
            setTimeout(() => {
                const nodeEl = document.querySelector(`[data-id="${nodeId}"]`)
                if (!nodeEl) return
                const parts = w.fieldPath!.split('.')
                let fieldEl: Element | null = null
                for (let len = parts.length; len > 0 && !fieldEl; len--) {
                    const tryPath = parts.slice(0, len).join('.')
                    fieldEl = nodeEl.querySelector(`[data-field-path="${tryPath}"]`)
                }
                if (fieldEl) {
                    fieldEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    fieldEl.classList.add('warning-flash')
                    setTimeout(() => fieldEl!.classList.remove('warning-flash'), 2000)
                }
            }, 450)
        }
    }, [fitView])

    const handleContextMenu = useCallback((e: React.MouseEvent, w: Notification) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY, warning: w })
    }, [])

    // Dismiss context menu on click outside
    useEffect(() => {
        if (!contextMenu) return
        const handler = () => setContextMenu(null)
        window.addEventListener('click', handler)
        return () => window.removeEventListener('click', handler)
    }, [contextMenu])

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const activeCount = activeWarnings.length
    const suppressedCount = suppressedWarnings.length

    return (
        <div className="h-full flex flex-col border-l border-border bg-background" style={{ width: 360 }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <span className="text-sm font-semibold">Warnings ({activeCount})</span>
                <button onClick={() => { setFilterNodeId(null); onClose(); }} className="p-1 rounded hover:bg-accent transition-colors cursor-pointer">
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* Node filter chip */}
            {filterNodeId && (
                <div className="px-3 py-1.5 border-b border-border shrink-0">
                    <div className="inline-flex items-center gap-1.5 bg-brand-muted text-brand text-xs font-medium px-2 py-1 rounded-full">
                        <span className="truncate max-w-[200px]">
                            Node: {(() => {
                                const node = nodes.find(n => n.id === filterNodeId)
                                return node?.data?.kind
                                    ? `${(node.data as any).kind}`
                                    : filterNodeId
                            })()}
                        </span>
                        <button
                            onClick={() => setFilterNodeId(null)}
                            className="hover:bg-brand/20 rounded-full p-0.5 cursor-pointer"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="px-3 py-2 border-b border-border shrink-0">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search warnings..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
            </div>

            {/* Tabs + Group-by */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
                <div className="inline-flex items-center rounded-md border border-border bg-muted p-0.5 gap-0.5">
                    <button
                        onClick={() => setTab('active')}
                        className={`px-2 py-0.5 text-xs rounded-sm font-medium transition-colors ${
                            tab === 'active' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Active ({activeCount})
                    </button>
                    <button
                        onClick={() => setTab('suppressed')}
                        className={`px-2 py-0.5 text-xs rounded-sm font-medium transition-colors ${
                            tab === 'suppressed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Suppressed ({suppressedCount})
                    </button>
                </div>
                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                    className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground"
                >
                    <option value="type">By Type</option>
                    <option value="node">By Node</option>
                    <option value="none">None</option>
                </select>
            </div>

            {/* Warning list */}
            <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-2">
                {filtered.length === 0 ? (
                    <p className="text-muted-foreground text-xs py-4 text-center">
                        {tab === 'active' ? 'No active warnings' : 'No suppressed warnings'}
                    </p>
                ) : (
                    grouped.map((group) => (
                        <div key={group.key}>
                            {groupBy !== 'none' && (
                                <button
                                    onClick={() => toggleGroup(group.key)}
                                    className="flex items-center gap-1.5 w-full text-left text-xs font-semibold text-muted-foreground py-1 hover:text-foreground transition-colors cursor-pointer"
                                >
                                    <span className={`transition-transform ${collapsedGroups.has(group.key) ? '' : 'rotate-90'}`}>
                                        &#9654;
                                    </span>
                                    {group.label}
                                    <span className="ml-auto text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded">
                                        {group.warnings.length}
                                    </span>
                                </button>
                            )}
                            {!collapsedGroups.has(group.key) && (
                                <div className="space-y-1">
                                    {group.warnings.map((w, idx) => (
                                        <div
                                            key={`${w.id}-${idx}`}
                                            className="flex items-start gap-2 p-2 rounded border border-border cursor-pointer hover:bg-accent transition-colors"
                                            onClick={() => navigateToWarning(w)}
                                            onContextMenu={(e) => handleContextMenu(e, w)}
                                        >
                                            {levelIcon[w.level ?? 'info']}
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-semibold truncate">{w.title}</h4>
                                                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{w.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Context menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-popover border border-border shadow-lg rounded-md py-1 text-xs"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {tab === 'active' ? (
                        <button
                            className="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer"
                            onClick={() => {
                                suppressWarning(getSuppressionKey(contextMenu.warning))
                                setContextMenu(null)
                            }}
                        >
                            Suppress this warning
                        </button>
                    ) : (
                        <button
                            className="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer"
                            onClick={() => {
                                unsuppressWarning(getSuppressionKey(contextMenu.warning))
                                setContextMenu(null)
                            }}
                        >
                            Restore this warning
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
