'use client';

import React from 'react';
import { Node, Edge, ReactFlowProvider } from '@xyflow/react';
import MainSidebar from '@/components/sidebar/sidebar.main.component';
import Flow from '@/components/flow/flow.main.component';
import { useAutoSave } from '@/hooks/useAutoSave';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { ProjectProvider, useProject } from '@/contexts/ProjectContext';
import { NodeProvider } from '@/providers/NodeProvider';
import { ProjectDataService } from '@/services/project.data.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProjectDataManager } from '@/hooks/useProjectDataManager';
import { useWarning } from '@/providers/WarningsProvider';
import { useVersion } from '@/providers/VersionProvider';
import { LayoutPanelLeft, Columns2, FileCode2, LayoutGrid } from 'lucide-react';
import Dagre from 'dagre';
import WarningsBadge from '@/components/warnings/warnings.main.component';
import WarningsSidebar from '@/components/warnings/warnings.sidebar.component';
import { resolveNodeValues } from '@/lib/export';
import yaml from 'js-yaml';
import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeContext';
import { analytics } from '@/lib/analytics';

// Configure Monaco to use locally bundled version (must be imported before MonacoEditor)
import '@/lib/monaco-config';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export type EditorViewMode = 'graph' | 'split' | 'yaml';

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 200;

function getLayoutedNodes(nodes: Node[], edges: Edge[], direction: 'LR' | 'TB' = 'LR'): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    const w = node.measured?.width ?? (node.width as number | undefined) ?? DEFAULT_WIDTH;
    const h = node.measured?.height ?? (node.height as number | undefined) ?? DEFAULT_HEIGHT;
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const w = node.measured?.width ?? (node.width as number | undefined) ?? DEFAULT_WIDTH;
    const h = node.measured?.height ?? (node.height as number | undefined) ?? DEFAULT_HEIGHT;
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });
}

function ViewToggle({ mode, onChange }: { mode: EditorViewMode; onChange: (m: EditorViewMode) => void }) {
  const buttons: { value: EditorViewMode; icon: React.ReactNode; label: string }[] = [
    { value: 'graph', icon: <LayoutPanelLeft className="w-3.5 h-3.5" />, label: 'Graph' },
    { value: 'split', icon: <Columns2 className="w-3.5 h-3.5" />, label: 'Split' },
    { value: 'yaml', icon: <FileCode2 className="w-3.5 h-3.5" />, label: 'YAML' },
  ];

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-muted p-0.5 gap-0.5">
      {buttons.map((b) => (
        <button
          key={b.value}
          onClick={() => onChange(b.value)}
          className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
            mode === b.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {b.icon}
          {b.label}
        </button>
      ))}
    </div>
  );
}

const YamlPreviewPanel = React.memo(function YamlPreviewPanel({ getNodesEdges }: { getNodesEdges: () => { nodes: Node[]; edges: Edge[] } }) {
  const { resolvedTheme } = useTheme();
  const [yamlContent, setYamlContent] = React.useState('');
  const lastYamlRef = React.useRef('');

  React.useEffect(() => {
    const update = () => {
      const { nodes, edges } = getNodesEdges();
      const resolved = resolveNodeValues(nodes, edges);
      const allNonRef = nodes.filter(
        (n) => n.type !== 'ObjectRefNode' && n.type !== 'StorageBucketNode'
      );
      const kindNodes = nodes.filter((n) => n.type === 'KindNode');
      const docs: string[] = [];
      kindNodes.forEach((kn) => {
        const idx = allNonRef.findIndex((n) => n.id === kn.id);
        if (idx >= 0 && resolved[idx]) {
          docs.push(yaml.dump(resolved[idx], { lineWidth: -1 }));
        }
      });
      const newYaml = docs.join('---\n');
      if (newYaml !== lastYamlRef.current) {
        lastYamlRef.current = newYaml;
        setYamlContent(newYaml);
      }
    };

    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, [getNodesEdges]);

  const resourceCount = yamlContent ? yamlContent.split('---').filter(s => s.trim()).length : 0;

  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background shrink-0">
        <span className="text-xs font-medium text-muted-foreground">YAML Output</span>
        <span className="text-[10px] text-muted-foreground">{resourceCount} resource{resourceCount !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          defaultLanguage="yaml"
          language="yaml"
          value={yamlContent || '# No resources'}
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            readOnly: true,
            wordWrap: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: 'on',
          }}
        />
      </div>
    </div>
  );
});

interface KubeForgeEditorProps {
  project: {
    id: string;
    name: string;
    slug: string;
    kubernetesVersion?: string | null;
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
  integrationsPanel?: React.ReactNode;
  toolbarLeft?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  agentPanel?: React.ReactNode;
  clusterVersion?: string;
}

function VersionMismatchBanner({ clusterVersion, projectVersion, projectId }: { clusterVersion: string; projectVersion: string; projectId: string }) {
  const [dismissed, setDismissed] = React.useState(false);
  const { setVersion } = useVersion();

  if (dismissed || !clusterVersion || !projectVersion || clusterVersion === projectVersion) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
      <span>Your cluster runs <strong>{clusterVersion}</strong> but this project targets <strong>{projectVersion}</strong>. Some APIs may not be available.</span>
      <button
        onClick={() => setVersion(clusterVersion)}
        className="ml-auto shrink-0 text-xs font-medium px-2 py-1 rounded bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
      >
        Update to {clusterVersion}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}

function EditorInner({ project, initialNodes, initialEdges, k8sVersions, integrationsPanel, toolbarLeft, toolbarExtra, agentPanel, clusterVersion }: KubeForgeEditorProps) {
  const [versionNodes, setVersionNodes] = React.useState<Node[] | null>(null);
  const [versionEdges, setVersionEdges] = React.useState<Edge[] | null>(null);
  const [loadingVersion, setLoadingVersion] = React.useState(false);
  const [currentVersionId, setCurrentVersionId] = React.useState<string | null>(null);
  const [currentVersionSlug, setCurrentVersionSlug] = React.useState<string | null>(null);
  const [getCurrentFlowState, setGetCurrentFlowState] = React.useState<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);
  const { setCurrentProject } = useProject();
  const { version, setProjectContext } = useVersion();

  React.useEffect(() => {
    setCurrentProject(project.id, project.name, project.slug);
    setProjectContext(project.id, project.kubernetesVersion ?? null);
  }, [project.id, project.name, project.slug, project.kubernetesVersion, setCurrentProject, setProjectContext]);

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

  const { notifications, suppressedKeys } = useWarning();

  const getWarningCounts = React.useCallback(() => {
    const active = notifications.filter(n => !suppressedKeys.has(n.ruleId));
    return {
      warnings: active.filter(n => n.level === 'warn' || n.level === 'info').length,
      errors: active.filter(n => n.level === 'danger').length,
    };
  }, [notifications, suppressedKeys]);

  const autoSave = useAutoSave({
    projectId: project.id,
    enabled: true,
    isReadOnly: !!currentVersionSlug,
    getState: getCurrentFlowState || undefined,
    getWarningCounts,
  });

  // Auto-layout
  const handleAutoLayout = React.useCallback(() => {
    const state = getCurrentNodesEdges();
    const layouted = getLayoutedNodes(state.nodes, state.edges, 'LR');
    setVersionNodes(layouted);
    setVersionEdges(state.edges);
    analytics.autoLayoutUsed();
  }, [getCurrentNodesEdges]);

  // Warnings sidebar
  const [warningsOpen, setWarningsOpen] = React.useState(false);

  // View mode toggle
  const [viewMode, setViewModeState] = React.useState<EditorViewMode>('graph');
  const setViewMode = React.useCallback((mode: EditorViewMode) => {
    setViewModeState(mode);
    analytics.viewModeChanged(mode);
  }, []);
  const [splitPercent, setSplitPercent] = React.useState(50);
  const dragging = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Manual save (version) dialog
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState('');
  const [saveError, setSaveError] = React.useState('');
  const dataManager = useProjectDataManager();

  const handleManualSave = async () => {
    setSaveError('');
    try {
      const currentState = getCurrentNodesEdges();
      const cleanNodes = currentState.nodes.map(({ measured, selected, dragging, ...rest }: Node & { measured?: unknown; selected?: boolean; dragging?: boolean }) => rest) as Node[];
      await dataManager.updateProject(
        cleanNodes,
        currentState.edges,
        saveMessage || 'Manual save'
      );
      analytics.projectVersionSaved(project.id, !!saveMessage);
      setSaveDialogOpen(false);
      setSaveMessage('');
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

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
      integrationsPanel={integrationsPanel}
      toolbarLeft={toolbarLeft}
      toolbarCenter={<ViewToggle mode={viewMode} onChange={setViewMode} />}
      toolbarExtra={toolbarExtra}
    >
      {clusterVersion && (
        <VersionMismatchBanner
          clusterVersion={clusterVersion}
          projectVersion={version}
          projectId={project.id}
        />
      )}
      <div
        ref={containerRef}
        className="relative flex-grow flex overflow-hidden"
        style={{ height: '100%', minHeight: 0 }}
        onMouseMove={(e) => {
          if (!dragging.current || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const pct = ((e.clientX - rect.left) / rect.width) * 100;
          setSplitPercent(Math.min(Math.max(pct, 20), 80));
        }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
      >
        {agentPanel && (
          <div className="shrink-0 h-full">
            {agentPanel}
          </div>
        )}
        {viewMode !== 'yaml' && (
          <div style={{ width: viewMode === 'split' ? `${splitPercent}%` : '100%', height: '100%', display: 'flex', position: 'relative' }}>
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
              onOpenWarnings={() => setWarningsOpen(true)}
            />
            {!currentVersionSlug && (
              <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                <button
                  onClick={handleAutoLayout}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-background border border-border hover:bg-accent transition-colors cursor-pointer"
                  title="Auto-layout nodes"
                >
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                </button>
                <WarningsBadge onClick={() => setWarningsOpen(o => !o)} />
                <AutoSaveIndicator
                  status={autoSave.status}
                  lastSaved={autoSave.lastSaved}
                  error={autoSave.error}
                  onClick={() => setSaveDialogOpen(true)}
                />
                <Dialog open={saveDialogOpen} onOpenChange={(open) => {
                  setSaveDialogOpen(open);
                  if (!open) { setSaveError(''); setSaveMessage(''); }
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Version</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Version message (optional)"
                        value={saveMessage}
                        onChange={(e) => setSaveMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleManualSave(); }}
                        autoFocus
                      />
                      {saveError && <p className="text-sm text-red-500">{saveError}</p>}
                      <Button onClick={handleManualSave} disabled={dataManager.saving} className="w-full">
                        {dataManager.saving ? 'Saving...' : 'Save Version'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}
        {viewMode === 'split' && (
          <div
            className="shrink-0 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
            style={{ width: 4, height: '100%', background: 'var(--border)' }}
            onMouseDown={(e) => { e.preventDefault(); dragging.current = true; }}
          />
        )}
        {viewMode !== 'graph' && (
          <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
            <YamlPreviewPanel getNodesEdges={getCurrentNodesEdges} />
          </div>
        )}
        {warningsOpen && (
          <div className="shrink-0 h-full">
            <WarningsSidebar onClose={() => setWarningsOpen(false)} />
          </div>
        )}
      </div>
    </MainSidebar>
  );
}

export function KubeForgeEditor(props: KubeForgeEditorProps) {
  return (
    <ReactFlowProvider>
      <NodeProvider>
        <ProjectProvider>
          <EditorInner {...props} />
        </ProjectProvider>
      </NodeProvider>
    </ReactFlowProvider>
  );
}
