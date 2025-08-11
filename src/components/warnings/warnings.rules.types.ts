export type NodeWarning = {
    id: number
    title: string
    message: string
    level?: 'info' | 'warn' | 'danger',
    nodes?: any
}

type RuleFunction = (node: any, index: number, context?: any) => NodeWarning | null
import singletonKinds from '../data/schema-singleton.json'

const singletonKindRule: RuleFunction = (node, index, context) => {
    const kind = node.data?.kind?.toLowerCase()
    const nodeId = node.id

    if (!kind || !singletonKinds.kind.includes(kind)) return null

    if (!context.seenKinds[kind]) {
        context.seenKinds[kind] = [nodeId]
    } else {
        context.seenKinds[kind].push(nodeId)
    }

    if (context.seenKinds[kind].length === 2) {
        return {
            id: 9000 + index,
            nodes: context.seenKinds[kind],
            title: `Multiple "${kind}" detected`,
            message: `Usually one "${kind}" kind is used per deployment.`,
            level: 'danger'
        }
    }

    return null
}

const overlappingNodeRule: RuleFunction = (() => {
    return (_node, _index, context) => {
        const warnings: NodeWarning[] = []
        const seen: Set<string> = new Set()
        const nodes = context?.allNodes || []

        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i]
            const aBox = {
                x1: a.position.x,
                y1: a.position.y,
                x2: a.position.x + (a.measured?.width || 0),
                y2: a.position.y + (a.measured?.height || 0),
            }

            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j]
                const bBox = {
                    x1: b.position.x,
                    y1: b.position.y,
                    x2: b.position.x + (b.measured?.width || 0),
                    y2: b.position.y + (b.measured?.height || 0),
                }

                const overlaps =
                    aBox.x1 < bBox.x2 &&
                    aBox.x2 > bBox.x1 &&
                    aBox.y1 < bBox.y2 &&
                    aBox.y2 > bBox.y1

                if (overlaps) {
                    const key = [a.id, b.id].sort().join(':')
                    if (!seen.has(key)) {
                        seen.add(key)
                        warnings.push({
                            id: 8000 + warnings.length,
                            title: 'Overlapping Nodes',
                            message: `Node "${a.data.type}" overlaps with "${b.data.type ?? "ObjectRef"}".`,
                            nodes: [a.id, b.id],
                            level: 'info',
                        })
                    }
                }
            }
        }

        context.__overlapWarnings = warnings
        return null
    }
})()



export const nodeWarningRules: RuleFunction[] = [
    (node, index) => {
        const values = node.data?.values || {}
        if (node.type === 'ObjectRefNode' && Object.keys(values).length === 0) {
            return {
                id: index + 1,
                nodes: [node.id],
                title: `Empty objectRef for "${node?.data?.kind}"`,
                message: `Node "objectRef.${node?.data?.kind}" has no values configured.`,
                level: 'danger'
            }
        }
        return null
    },
    //singletonKindRule,
    overlappingNodeRule
]

