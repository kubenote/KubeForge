'use client';

import { useEffect, useCallback, useRef } from 'react';
import { ReactFlow, Background, BackgroundVariant, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useVersion } from '../../providers/version.provider';
import { KindNode } from './nodes/node.kind.component';
import { ObjectRefNode } from './nodes/node.objectref.component';
import { StorageBucketNode } from './nodes/node.storagebucket.component';
import {
  SecretRefNode, RegistryNode, ConfigMapNode, IngressNode,
  DatabaseNode, MessageQueueNode, LoggingSidecarNode, MonitoringNode, ServiceAccountNode
} from './nodes/node.integration.component';
import ContextMenu from './flow.contextmenu.component';
import { TopProgressBar } from '../ui/progress-bar';
import { ReadOnlyProvider } from '@/contexts/read-only.context';
import { useSchemaLoader } from './hooks/use-schema-loader.hook';
import { useFlowState } from './hooks/use-flow-state.hook';
import { useProjectSync } from './hooks/use-project-sync.hook';
import { useFlowInteractions } from './hooks/use-flow-interactions.hook';
import { useFlowHistory } from './hooks/use-flow-history.hook';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts.hook';
import { useClipboard } from './hooks/use-clipboard.hook';
import { analytics } from '@/lib/analytics';

const nodeTypes = {
  KindNode: KindNode,
  ObjectRefNode: ObjectRefNode,
  StorageBucketNode: StorageBucketNode,
  SecretRefNode: SecretRefNode,
  RegistryNode: RegistryNode,
  ConfigMapNode: ConfigMapNode,
  IngressNode: IngressNode,
  DatabaseNode: DatabaseNode,
  MessageQueueNode: MessageQueueNode,
  LoggingSidecarNode: LoggingSidecarNode,
  MonitoringNode: MonitoringNode,
  ServiceAccountNode: ServiceAccountNode,
};

interface FlowProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  initialProjectId?: string;
  initialProjectName?: string;
  initialProjectSlug?: string;
  onVersionLoad?: (nodes: Node[], edges: Edge[], versionId?: string | null, versionData?: { id: string; slug?: string | null }) => void;
  loadingVersion?: boolean;
  onGetCurrentState?: (callback: () => { nodes: Node[]; edges: Edge[] }) => void;
  skipTemplate?: boolean;
  currentVersionSlug?: string | null;
  readOnly?: boolean;
  onSave?: () => void;
  onOpenWarnings?: () => void;
}

export default function FlowRefactored({
  initialNodes = [],
  initialEdges = [],
  initialProjectId = '',
  initialProjectName = '',
  initialProjectSlug = '',
  onVersionLoad,
  loadingVersion = false,
  onGetCurrentState,
  skipTemplate = false,
  currentVersionSlug = null,
  readOnly = false,
  onSave,
  onOpenWarnings
}: FlowProps) {
  const { version } = useVersion();

  // Custom hooks for separated concerns
  const { nodes, edges, setNodes, setEdges } = useFlowState({
    initialNodes,
    initialEdges,
    skipTemplate,
    onGetCurrentState
  });

  const { loading: schemaLoading } = useSchemaLoader(nodes, version);

  const { handleLoadProject, handleLoadVersion } = useProjectSync({
    initialProjectId,
    initialProjectName,
    initialProjectSlug,
    onVersionLoad
  });

  const {
    menu,
    ref,
    onNodeContextMenu,
    onPaneClick,
    onNodesChange,
    onEdgesChange,
    onConnect,
    handlePluginConnect,
    handlePluginEdgeDelete,
  } = useFlowInteractions();

  // Determine if we're in read-only mode
  const isReadOnly = readOnly || !!currentVersionSlug;

  // History management for undo/redo
  const {
    recordHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    pushToFuture,
    pushToHistory
  } = useFlowHistory();

  // Track previous state for history recording
  const prevStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const isHistoryActionRef = useRef(false);

  // Record initial state
  useEffect(() => {
    if (nodes.length > 0 && !prevStateRef.current && !isReadOnly) {
      prevStateRef.current = { nodes, edges };
    }
  }, [nodes, edges, isReadOnly]);

  // Record changes to history (debounced in the hook)
  useEffect(() => {
    if (isReadOnly || isHistoryActionRef.current) {
      return;
    }

    if (prevStateRef.current && (nodes !== prevStateRef.current.nodes || edges !== prevStateRef.current.edges)) {
      recordHistory(prevStateRef.current.nodes, prevStateRef.current.edges);
      prevStateRef.current = { nodes, edges };
    }
  }, [nodes, edges, recordHistory, isReadOnly]);

  // Handle undo action
  const handleUndo = useCallback(() => {
    if (!canUndo || isReadOnly) return;

    isHistoryActionRef.current = true;
    pushToFuture(nodes, edges);

    const previousState = undo();
    if (previousState) {
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      prevStateRef.current = { nodes: previousState.nodes, edges: previousState.edges };
    }

    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 100);
  }, [canUndo, isReadOnly, nodes, edges, pushToFuture, undo, setNodes, setEdges]);

  // Handle redo action
  const handleRedo = useCallback(() => {
    if (!canRedo || isReadOnly) return;

    isHistoryActionRef.current = true;
    pushToHistory(nodes, edges);

    const nextState = redo();
    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      prevStateRef.current = { nodes: nextState.nodes, edges: nextState.edges };
    }

    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 100);
  }, [canRedo, isReadOnly, nodes, edges, pushToHistory, redo, setNodes, setEdges]);

  // Clipboard operations
  const { copySelected, pasteFromClipboard, cutSelected } = useClipboard({
    isReadOnly,
    setNodes,
    setEdges,
  });

  // All keyboard shortcuts consolidated into a single listener
  useKeyboardShortcuts({
    isReadOnly,
    onSave,
    setNodes,
    setEdges,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCopy: copySelected,
    onPaste: pasteFromClipboard,
    onCut: cutSelected,
  });

  return (
    <div className='flex flex-grow relative'>
      <ReadOnlyProvider isReadOnly={isReadOnly}>
        <ReactFlow
          ref={ref}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={isReadOnly ? undefined : (changes) => setNodes(onNodesChange(changes))}
          onEdgesChange={isReadOnly ? undefined : (changes) => {
            // Detect removed edges for plugin slot cleanup
            const removeChanges = changes.filter((c) => c.type === 'remove');
            if (removeChanges.length > 0) {
              // Get current edges before applying changes to find what was removed
              setEdges((currentEdges) => {
                const removedIds = new Set(removeChanges.map((c: any) => c.id));
                const removedEdges = currentEdges.filter((e) => removedIds.has(e.id));
                if (removedEdges.length > 0) {
                  setNodes((currentNodes) => handlePluginEdgeDelete(removedEdges, currentNodes));
                }
                return onEdgesChange(changes)(currentEdges);
              });
              return;
            }
            setEdges(onEdgesChange(changes));
          }}
          onConnect={isReadOnly ? undefined : (params) => {
            const isPluginHandle = params.targetHandle?.startsWith('target-plugin-');
            if (isPluginHandle && params.source) {
              // Rewrite the edge so it targets the filled-slot handle instead of -empty
              const rewritten = {
                ...params,
                targetHandle: `target-plugin-${params.target}-${params.source}`,
              };
              setEdges(onConnect(rewritten));
              setNodes((currentNodes) => handlePluginConnect(rewritten, currentNodes));
            } else {
              setEdges(onConnect(params));
            }
            // Track connection
            const sourceNode = nodes.find(n => n.id === params.source);
            const targetNode = nodes.find(n => n.id === params.target);
            analytics.nodesConnected(sourceNode?.type || 'unknown', targetNode?.type || 'unknown');
          }}
          onPaneClick={onPaneClick}
          onNodeContextMenu={isReadOnly ? undefined : onNodeContextMenu}
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={!isReadOnly}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} />
          {menu && <ContextMenu onClick={onPaneClick} onOpenWarnings={onOpenWarnings} {...menu} />}
        </ReactFlow>
      </ReadOnlyProvider>

      {/* Read-only indicator */}
      {isReadOnly && (
        <div className="absolute top-4 right-4 z-40">
          <div className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-3 py-2 rounded-md text-sm font-medium shadow-lg border border-amber-300 dark:border-amber-700">
            Read-only mode
          </div>
        </div>
      )}

      <TopProgressBar loading={schemaLoading || loadingVersion} />
      {loadingVersion && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Loading version...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
