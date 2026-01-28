'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@xyflow/react'
import { NodeWarning, nodeWarningRules } from './warnings.rules.types'
import { Info, AlertTriangle, OctagonAlert, TriangleAlert } from 'lucide-react'
import { useWarning } from '../../providers/WarningsProvider'

const levelIcon = {
    info: <Info className="text-blue-500 w-4 h-4" />,
    warn: <AlertTriangle className="text-yellow-500 w-4 h-4" />,
    danger: <OctagonAlert className="text-red-500 w-4 h-4" />,
}

export default function WarningsDrawer() {
    const [open, setOpen] = useState(false)
    const nodes = useStore((s) => s.nodes)

    const { notifications, setNotifications } = useWarning()
    const prevWarningsRef = useRef<string>('')

    const warnings = useMemo(() => {
        const warningsArray: NodeWarning[] = []
        const context: {
            seenKinds: Record<string, string[]>;
            allNodes: typeof nodes;
            __overlapWarnings?: NodeWarning[];
        } = {
            seenKinds: {} as Record<string, string[]>,
            allNodes: nodes
        }

        nodes.forEach((node, index) => {
            nodeWarningRules.forEach((rule) => {
                const result = rule(node, index, context)
                if (result) warningsArray.push(result)
            })
        })

        // Collect any batch overlap warnings
        if (context.__overlapWarnings?.length) {
            warningsArray.push(...context.__overlapWarnings)
        }

        return warningsArray
    }, [nodes])

    useEffect(() => {
        // Create a stable string representation for comparison
        const warningsStr = JSON.stringify(
            warnings
                .map(w => ({ id: w.id, title: w.title, message: w.message, level: w.level }))
                .sort((a, b) => a.id - b.id)
        )
        
        // Only update if warnings actually changed
        if (prevWarningsRef.current !== warningsStr) {
            prevWarningsRef.current = warningsStr
            setNotifications(warnings)
        }
    }, [warnings, setNotifications])


    return (
        <>
            {notifications.length > 0 && (<Button
                variant="default"
                className="bg-orange-400"
                onClick={() => setOpen(true)}
            >
                <TriangleAlert color="white" />
            </Button>)}

            <Drawer open={open} onOpenChange={setOpen} direction="right">
                <DrawerContent className="right-0 ml-auto w-[320px] sm:w-[400px]">
                    <DrawerHeader>
                        <DrawerTitle>Warnings</DrawerTitle>
                    </DrawerHeader>

                    <div className="px-4 pb-4 space-y-3 overflow-y-auto max-h-[calc(100vh-6rem)]">
                        {notifications.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No warnings 🎉</p>
                        ) : (
                            notifications.sort().map((note) => (
                                <Card key={note.id} className="shadow-md rounded-sm p-2">
                                    <CardContent className="px-2 flex items-start gap-2">
                                        {levelIcon[note.level ?? 'info']}
                                        <div>
                                            <h3 className="text-xs font-semibold mb-1">{note.title}</h3>
                                            <p className="text-xs text-muted-foreground">{note.message}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    )
}
