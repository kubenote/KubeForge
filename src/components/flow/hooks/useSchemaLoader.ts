import { useEffect, useState, useRef } from 'react'
import { Node } from '@xyflow/react'
import { useSchema } from '@/providers/SchemaProvider'
import { useNodeProvider } from '@/providers/NodeProvider'

export const useSchemaLoader = (nodes: Node[], version: string | null) => {
    const [loading, setLoading] = useState(false)
    const { setSchemaGvks } = useSchema()
    const { getSchema } = useNodeProvider()
    const loadedSchemasRef = useRef(new Set<string>())

    // Load schema GVKs when version changes
    useEffect(() => {
        if (!version) return

        setLoading(true)
        fetch(`/api/schema/load?version=${version}`)
            .then((res) => res.json())
            .then((data) => {
                console.log(data)
                setSchemaGvks(data.gvks)
            })
            .catch((e) => {
                console.error(e)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [version, setSchemaGvks])

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
        })

        // Filter out already loaded schemas
        const newSchemasToLoad = Array.from(kindsToLoad).filter(kind => {
            const schemaKey = `${version}-${kind}`
            return !loadedSchemasRef.current.has(schemaKey)
        })

        if (newSchemasToLoad.length > 0) {
            console.log('🔄 Flow: Loading NEW schemas for kinds:', newSchemasToLoad)
            
            // Mark as being loaded to prevent duplicates
            newSchemasToLoad.forEach(kind => {
                loadedSchemasRef.current.add(`${version}-${kind}`)
            })
            
            getSchema({ schemas: newSchemasToLoad, v: version })
        } else {
            console.log('✅ Flow: All required schemas already loaded')
        }
    }, [nodes, version, getSchema])

    return { loading, loadedSchemasRef }
}