'use client';

import { useEffect, useCallback, useRef } from 'react';
import { ReactFlow, Background, BackgroundVariant, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useVersion } from '../../providers/VersionProvider';
import { KindNode } from './nodes/node.kind.component';
import { ObjectRefNode } from './nodes/node.objectref.component';
import ContextMenu from './flow.contextmenu.component';
import { TopProgressBar } from '../ui/progress-bar';
import { ReadOnlyProvider } from '@/contexts/ReadOnlyContext';
import { useSchemaLoader } from './hooks/useSchemaLoader';
import { useFlowState } from './hooks/useFlowState';
import { useProjectSync } from './hooks/useProjectSync';
import { useFlowInteractions } from './hooks/useFlowInteractions';
import { useFlowHistory } from './hooks/useFlowHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useClipboard } from './hooks/useClipboard';

const nodeTypes = {
  KindNode: KindNode,
  ObjectRefNode: ObjectRefNode
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
  onSave
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
    onConnect
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

  // Keyboard shortcuts for undo/redo and copy/paste
  useEffect(() => {
    if (isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+C / Cmd+C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }

      // Ctrl+V / Cmd+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteFromClipboard();
        return;
      }

      // Ctrl+X / Cmd+X - Cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        cutSelected();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReadOnly, handleUndo, handleRedo, copySelected, pasteFromClipboard, cutSelected]);

  // Keyboard shortcuts for delete, duplicate, save, escape
  useKeyboardShortcuts({
    isReadOnly,
    onSave,
    setNodes,
    setEdges,
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
          onEdgesChange={isReadOnly ? undefined : (changes) => setEdges(onEdgesChange(changes))}
          onConnect={isReadOnly ? undefined : (params) => setEdges(onConnect(params))}
          onPaneClick={onPaneClick}
          onNodeContextMenu={isReadOnly ? undefined : onNodeContextMenu}
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={!isReadOnly}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} />
          {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
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
