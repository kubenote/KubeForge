'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Flow from "@/components/flow/flow.main.component";
import MainSidebar from "@/components/sidebar/sidebar.main.component";
import { Node, Edge } from '@xyflow/react';
import { getVersionUrlId, findVersionByUrlId, isValidVersionId } from '@/lib/versionUtils';
import { ProjectDataService } from '@/services/project.data.service';

interface Project {
  id: string;
  name: string;
  slug: string;
  versions: Array<{
    id: string;
    slug?: string | null;
    createdAt: string;
    message: string | null;
  }>;
}

interface ProjectPageClientProps {
  project: Project;
  initialNodes: Node[];
  initialEdges: Edge[];
  topics: string[];
  versions: any;
}

export function ProjectPageClient({ 
  project, 
  initialNodes, 
  initialEdges, 
  topics, 
  versions 
}: ProjectPageClientProps) {
  const [versionNodes, setVersionNodes] = useState<Node[] | null>(null);
  const [versionEdges, setVersionEdges] = useState<Edge[] | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [currentVersionSlug, setCurrentVersionSlug] = useState<string | null>(null);
  const [getCurrentFlowState, setGetCurrentFlowState] = useState<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);
  const router = useRouter();

  // Check for version hash on component mount
  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return;
    
    const hash = window.location.hash.slice(1); // Remove the # character
    
    // Skip processing if no hash
    if (!hash) {
      return;
    }
    
    // Handle both new format (#calm-forest) and legacy format (#version-calm-forest)
    let versionUrlId = hash;
    if (hash.startsWith('version-')) {
      versionUrlId = hash.replace('version-', '');
      // Update URL to new format
      const newHash = `#${versionUrlId}`;
      window.history.replaceState(null, '', `${window.location.pathname}${newHash}`);
    }
    
    if (versionUrlId && isValidVersionId(versionUrlId)) {
      const version = findVersionByUrlId(versionUrlId, project.versions);
      if (version) {
        setCurrentVersionId(version.id);
        setCurrentVersionSlug(version.slug || null);
        loadVersionFromHash(version.id);
      } else {
        // Invalid version ID, clear hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      // Invalid format, clear hash
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [project.versions, project.id]); // Add necessary dependencies

  const loadVersionFromHash = async (versionId: string) => {
    setLoadingVersion(true);
    try {
      const versionData = await ProjectDataService.loadProjectVersion(project.id, versionId);
      setVersionNodes(versionData.nodes);
      setVersionEdges(versionData.edges);
    } catch (error) {
      console.error('Error loading version from hash:', error);
      // Clear invalid hash
      window.history.replaceState(null, '', window.location.pathname);
    } finally {
      setLoadingVersion(false);
    }
  };

  const handleVersionLoad = (nodes: Node[], edges: Edge[], versionId?: string | null, versionData?: { id: string; slug?: string | null }) => {
    // Update URL hash based on version ID
    if (versionId) {
      setCurrentVersionId(versionId);
      // Use provided version data if available, otherwise try to find in project.versions
      const version = versionData || project.versions.find(v => v.id === versionId);
      if (version) {
        setCurrentVersionSlug(version.slug || null);
        const urlId = getVersionUrlId(version);
        const newHash = `#${urlId}`;
        window.history.pushState(null, '', `${window.location.pathname}${newHash}`);
      }
      // Set version data for Flow component remount
      setVersionNodes(nodes);
      setVersionEdges(edges);
    } else if (versionId === null) {
      // Explicitly requested to clear version (Load Latest button)
      setCurrentVersionId(null);
      setCurrentVersionSlug(null);
      window.history.pushState(null, '', window.location.pathname);
      // Reset to initial data
      setVersionNodes(null);
      setVersionEdges(null);
    }
    // If versionId is undefined and currentVersionId exists, preserve the current URL
  };

  const handleLoadProject = (nodes: Node[], edges: Edge[], projectId: string, projectName: string) => {
    setVersionNodes(nodes);
    setVersionEdges(edges);
    setCurrentVersionId(null);
    setCurrentVersionSlug(null);
  };

  const handleGetFlowState = useCallback((callback: () => { nodes: Node[]; edges: Edge[] }) => {
    setGetCurrentFlowState(() => callback);
  }, []);

  // Function to get current nodes/edges from Flow component instead of stale props
  const getCurrentNodesEdges = useCallback(() => {
    if (getCurrentFlowState) {
      return getCurrentFlowState();
    }
    // Fallback to props if callback not available  
    return { nodes: versionNodes || initialNodes, edges: versionEdges || initialEdges };
  }, [getCurrentFlowState, versionNodes, versionEdges, initialNodes, initialEdges]);

  return (
    <MainSidebar 
      topics={topics} 
      versions={versions}
      currentNodes={versionNodes || initialNodes}
      currentEdges={versionEdges || initialEdges}
      currentVersionSlug={currentVersionSlug}
      onLoadProject={handleLoadProject}
      onLoadVersion={handleVersionLoad}
      getCurrentNodesEdges={getCurrentNodesEdges}
    >
      <Flow 
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        initialProjectId={project.id}
        initialProjectName={project.name}
        initialProjectSlug={project.slug}
        onVersionLoad={handleVersionLoad}
        loadingVersion={loadingVersion}
        currentVersionSlug={currentVersionSlug}
      />
    </MainSidebar>
  );
}