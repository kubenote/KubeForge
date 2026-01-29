'use client';

import React from 'react';
import { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MainSidebar from '@/components/sidebar/sidebar.main.component';
import Flow from '@/components/flow/flow.main.component';
import { useAutoSave } from '@/hooks/useAutoSave';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { ProjectProvider, useProject } from '@/contexts/ProjectContext';
import { ProjectDataService } from '@/services/project.data.service';

interface KubeForgeEditorProps {
  project: {
    id: string;
    name: string;
    slug: string;
    versions: Array<{
      id: string;
      slug?: string | null;
      createdAt: string;
      message: string | null;
    }>;
  };
  initialNodes: Node[];
  initialEdges: Edge[];
  k8sVersions: string[];
}

function EditorInner({ project, initialNodes, initialEdges, k8sVersions }: KubeForgeEditorProps) {
  const [versionNodes, setVersionNodes] = React.useState<Node[] | null>(null);
  const [versionEdges, setVersionEdges] = React.useState<Edge[] | null>(null);
  const [loadingVersion, setLoadingVersion] = React.useState(false);
  const [currentVersionId, setCurrentVersionId] = React.useState<string | null>(null);
  const [currentVersionSlug, setCurrentVersionSlug] = React.useState<string | null>(null);
  const [getCurrentFlowState, setGetCurrentFlowState] = React.useState<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);
  const { setCurrentProject } = useProject();

  React.useEffect(() => {
    setCurrentProject(project.id, project.name, project.slug);
  }, [project.id, project.name, project.slug, setCurrentProject]);

  // Check for version hash on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const version = project.versions.find(v => v.slug === hash || v.id === hash);
    if (version) {
      setCurrentVersionId(version.id);
      setCurrentVersionSlug(version.slug || null);
      loadVersionData(version.id);
    }
  }, [project.versions]);

  const loadVersionData = async (versionId: string) => {
    setLoadingVersion(true);
    try {
      const versionData = await ProjectDataService.loadProjectVersion(project.id, versionId);
      setVersionNodes(versionData.nodes);
      setVersionEdges(versionData.edges);
    } catch (error) {
      console.error('Error loading version:', error);
    } finally {
      setLoadingVersion(false);
    }
  };

  const handleVersionLoad = React.useCallback((nodes: Node[], edges: Edge[], versionId?: string | null, versionData?: { id: string; slug?: string | null }) => {
    if (versionId) {
      setCurrentVersionId(versionId);
      const version = versionData || project.versions.find(v => v.id === versionId);
      if (version) {
        setCurrentVersionSlug(version.slug || null);
        const urlId = version.slug || version.id;
        window.history.pushState(null, '', `${window.location.pathname}#${urlId}`);
      }
      setVersionNodes(nodes);
      setVersionEdges(edges);
    } else if (versionId === null) {
      setCurrentVersionId(null);
      setCurrentVersionSlug(null);
      window.history.pushState(null, '', window.location.pathname);
      setVersionNodes(null);
      setVersionEdges(null);
    }
  }, [project.versions]);

  const handleLoadProject = React.useCallback((nodes: Node[], edges: Edge[], _projectId: string, _projectName: string) => {
    setVersionNodes(nodes);
    setVersionEdges(edges);
    setCurrentVersionId(null);
    setCurrentVersionSlug(null);
  }, []);

  const handleGetFlowState = React.useCallback((callback: () => { nodes: Node[]; edges: Edge[] }) => {
    setGetCurrentFlowState(() => callback);
  }, []);

  const getCurrentNodesEdges = React.useCallback(() => {
    if (getCurrentFlowState) {
      return getCurrentFlowState();
    }
    return { nodes: versionNodes || initialNodes, edges: versionEdges || initialEdges };
  }, [getCurrentFlowState, versionNodes, versionEdges, initialNodes, initialEdges]);

  const autoSave = useAutoSave({
    projectId: project.id,
    enabled: true,
    isReadOnly: !!currentVersionSlug,
    getState: getCurrentFlowState || undefined,
  });

  return (
    <MainSidebar
      topics={[]}
      versions={k8sVersions}
      currentNodes={versionNodes || initialNodes}
      currentEdges={versionEdges || initialEdges}
      currentVersionSlug={currentVersionSlug}
      onLoadProject={handleLoadProject}
      onLoadVersion={handleVersionLoad}
      getCurrentNodesEdges={getCurrentNodesEdges}
    >
      <div className="relative flex-grow flex">
        <Flow
          initialNodes={versionNodes || initialNodes}
          initialEdges={versionEdges || initialEdges}
          initialProjectId={project.id}
          initialProjectName={project.name}
          initialProjectSlug={project.slug}
          onVersionLoad={handleVersionLoad}
          loadingVersion={loadingVersion}
          currentVersionSlug={currentVersionSlug}
          onGetCurrentState={handleGetFlowState}
        />
        {!currentVersionSlug && (
          <div className="absolute top-4 right-4 z-40">
            <AutoSaveIndicator
              status={autoSave.status}
              lastSaved={autoSave.lastSaved}
              error={autoSave.error}
            />
          </div>
        )}
      </div>
    </MainSidebar>
  );
}

export function KubeForgeEditor(props: KubeForgeEditorProps) {
  return (
    <ProjectProvider>
      <EditorInner {...props} />
    </ProjectProvider>
  );
}
