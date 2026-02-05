'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useStore } from '@xyflow/react'
import { NodeWarning, nodeWarningRules } from './warnings.rules.types'
import { resetPreDeploymentIds } from './warnings.predeployment.rules'
import { useWarning } from '../../providers/warnings.provider'
import { useVersion } from '../../providers/version.provider'
import { useSchema } from '../../providers/schema.provider'
import { TriangleAlert } from 'lucide-react'

interface WarningsBadgeProps {
    onClick: () => void
}

export default function WarningsBadge({ onClick }: WarningsBadgeProps) {
    const nodes = useStore((s) => s.nodes)
    const { notifications, setNotifications, suppressedKeys } = useWarning()
    const { version } = useVersion()
    const { schemaGvks } = useSchema()
    const prevWarningsRef = useRef<string>('')

    // Compute warnings (always mounted so provider stays in sync)
    const warnings = useMemo(() => {
        resetPreDeploymentIds()
        const warningsArray: NodeWarning[] = []
        const context: {
            seenKinds: Record<string, string[]>;
            allNodes: typeof nodes;
            __overlapWarnings?: NodeWarning[];
            projectVersion?: string;
            schemaGvks?: any[];
        } = {
            seenKinds: {} as Record<string, string[]>,
            allNodes: nodes,
            projectVersion: version || undefined,
            schemaGvks: schemaGvks || undefined,
        }

        nodes.forEach((node, index) => {
            nodeWarningRules.forEach((rule) => {
                const result = rule(node, index, context)
                if (result) warningsArray.push(result)
            })
        })

        if (context.__overlapWarnings?.length) {
            warningsArray.push(...context.__overlapWarnings)
        }

        return warningsArray
    }, [nodes, version, schemaGvks])

    useEffect(() => {
        const warningsStr = JSON.stringify(
            warnings
                .map(w => ({ id: w.id, title: w.title, message: w.message, level: w.level, ruleId: w.ruleId }))
                .sort((a, b) => a.id - b.id)
        )
        if (prevWarningsRef.current !== warningsStr) {
            prevWarningsRef.current = warningsStr
            setNotifications(warnings)
        }
    }, [warnings, setNotifications])

    // Count active (non-suppressed) warnings
    const activeCount = notifications.filter(n => {
        const key = `${n.nodes?.[0] ?? 'global'}::${n.ruleId}`
        return !suppressedKeys.has(key)
    }).length

    if (activeCount === 0) return null

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-orange-400 hover:bg-orange-500 transition-colors cursor-pointer"
        >
            <TriangleAlert className="h-4 w-4 text-white" />
            <span className="text-white">{activeCount}</span>
        </button>
    )
}
