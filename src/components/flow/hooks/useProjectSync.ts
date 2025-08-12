import { useEffect, useCallback } from 'react'
import { Node, Edge } from '@xyflow/react'
import { useProject } from '@/contexts/ProjectContext'

interface UseProjectSyncProps {
    initialProjectId?: string
    initialProjectName?: string
    initialProjectSlug?: string
    onVersionLoad?: (nodes: Node[], edges: Edge[], versionId?: string | null, versionData?: { id: string; slug?: string | null }) => void
}

export const useProjectSync = ({
    initialProjectId,
    initialProjectName,
    initialProjectSlug,
    onVersionLoad
}: UseProjectSyncProps) => {
    const { setCurrentProject } = useProject()

    // Set initial project if provided
    useEffect(() => {
        if (initialProjectId && initialProjectName) {
            setCurrentProject(initialProjectId, initialProjectName, initialProjectSlug)
        }
    }, [initialProjectId, initialProjectName, initialProjectSlug, setCurrentProject])

    const handleLoadProject = useCallback((nodes: Node[], edges: Edge[], projectId: string, projectName: string) => {
        setCurrentProject(projectId, projectName)
        return { nodes, edges }
    }, [setCurrentProject])

    const handleLoadVersion = useCallback((nodes: Node[], edges: Edge[], versionId?: string | null, versionData?: { id: string; slug?: string | null }) => {
        // Call parent callback if provided (for URL hash updates)
        if (onVersionLoad) {
            onVersionLoad(nodes, edges, versionId, versionData)
        }
        return { nodes, edges }
    }, [onVersionLoad])

    return {
        handleLoadProject,
        handleLoadVersion
    }
}