import { useEffect, useState, useRef } from 'react'
import { Node } from '@xyflow/react'
import { useSchema } from '@/providers/schema.provider'
import { useNodeProvider } from '@/providers/node.provider'

export const useSchemaLoader = (nodes: Node[], version: string | null) => {
    const [loading, setLoading] = useState(false)
    const { loadGvks } = useSchema()
    const { getSchema } = useNodeProvider()
    const loadedSchemasRef = useRef(new Set<string>())
    const gvkLoadedRef = useRef<string | null>(null)

    // Load schema GVKs when version changes
    useEffect(() => {
        if (!version) return
        // Prevent re-calling for the same version (handles Strict Mode double-fire)
        if (gvkLoadedRef.current === version) return
        gvkLoadedRef.current = version

        setLoading(true)
        loadGvks(version)
            .catch((e) => {
                console.error(e)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [version, loadGvks])

    // Load schemas for all kinds present in nodes
    useEffect(() => {
        if (!version || nodes.length === 0) return

        const kindsToLoad = new Set<string>()

        nodes.forEach(node => {
            if (node.data?.kind && typeof node.data.kind === 'string') {
                kindsToLoad.add(node.data.kind.toLowerCase())
            }
            if (node.data?.type && typeof node.data.type === 'string') {
                kindsToLoad.add(node.data.type.toLowerCase())
            }
            // ObjectRefNodes need nested schema keys like "pod.spec"
            if (node.type === 'ObjectRefNode' && node.data?.kind && node.data?.objectRef) {
                const nestedKey = `${(node.data.kind as string).toLowerCase()}.${node.data.objectRef}`
                kindsToLoad.add(nestedKey)
            }
        })

        // Filter out already loaded schemas
        const newSchemasToLoad = Array.from(kindsToLoad).filter(kind => {
            const schemaKey = `${version}-${kind}`
            return !loadedSchemasRef.current.has(schemaKey)
        })

        if (newSchemasToLoad.length > 0) {
            // Mark as being loaded to prevent duplicates
            newSchemasToLoad.forEach(kind => {
                loadedSchemasRef.current.add(`${version}-${kind}`)
            })

            getSchema({ schemas: newSchemasToLoad, v: version })
        }
    }, [nodes, version, getSchema])

    return { loading, loadedSchemasRef }
}
