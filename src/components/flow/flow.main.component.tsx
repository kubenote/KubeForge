'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, BackgroundVariant, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useVersion } from '../../providers/VersionProvider';
import { KindNode } from './nodes/node.kind.component';
import { ObjectRefNode } from './nodes/node.objectref.component';
import ContextMenu from './flow.contextmenu.component';
import { TopProgressBar } from '../ui/progress-bar';
import { useSchema } from 'components/providers/SchemaProvider';
import DefaultFlow from '../data/defaultFlow.json'
import { useNodeProvider } from 'components/providers/NodeProvider';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectDataManager } from '@/hooks/useProjectDataManager';
import { ReadOnlyProvider } from '@/contexts/ReadOnlyContext';

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
}

export default function Flow({ 
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
  readOnly = false
}: FlowProps) {

  const { version } = useVersion();
  const { setSchemaGvks } = useSchema();
  const { getSchema } = useNodeProvider();
  const { currentProjectId, currentProjectName, setCurrentProject, clearCurrentProject } = useProject();
  const dataManager = useProjectDataManager();
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
    right?: number;
    bottom?: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!version) return;

    setLoading(true)
    fetch(`/api/schema/load?version=${version}`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
        setSchemaGvks(data.gvks)
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        setLoading(false)
      })
  }, [version])

  // Load schemas for all kinds present in nodes - run only once per nodes/version change
  useEffect(() => {
    if (!version || nodes.length === 0) return;

    const kindsToLoad = new Set<string>();
    
    nodes.forEach(node => {
      if (node.data?.kind) {
        kindsToLoad.add(node.data.kind.toLowerCase());
      }
      if (node.data?.type) {
        kindsToLoad.add(node.data.type.toLowerCase());
      }
    });

    // Filter out already loaded schemas
    const newSchemasToLoad = Array.from(kindsToLoad).filter(kind => {
      const schemaKey = `${version}-${kind}`;
      return !loadedSchemasRef.current.has(schemaKey);
    });

    if (newSchemasToLoad.length > 0) {
      console.log('🔄 Flow: Loading NEW schemas for kinds:', newSchemasToLoad);
      
      // Mark as being loaded to prevent duplicates
      newSchemasToLoad.forEach(kind => {
        loadedSchemasRef.current.add(`${version}-${kind}`);
      });
      
      getSchema({ schemas: newSchemasToLoad, v: version });
    } else {
      console.log('✅ Flow: All required schemas already loaded');
    }
  }, [nodes, version]); // Removed getSchema from dependencies

  useEffect(() => {
    // Set initial project if provided
    if (initialProjectId && initialProjectName) {
      setCurrentProject(initialProjectId, initialProjectName, initialProjectSlug);
    }
  }, [initialProjectId, initialProjectName, initialProjectSlug, setCurrentProject]);

  // Use ref to provide stable callback that always returns current state
  const stateRef = useRef({ nodes, edges });
  stateRef.current = { nodes, edges };

  // Track loaded schemas to prevent duplicates
  const loadedSchemasRef = useRef(new Set<string>());

  // Create stable callback to get current state
  const getCurrentState = useCallback(() => stateRef.current, []);

  // Register callback to get current state (only when callback prop changes)
  useEffect(() => {
    if (onGetCurrentState) {
      onGetCurrentState(getCurrentState);
    }
  }, [onGetCurrentState, getCurrentState]);

  // Sync internal state with props when they change (for version switching)
  // Use refs to track previous values to prevent infinite loops
  const prevNodesRef = useRef<Node[]>();
  const prevEdgesRef = useRef<Edge[]>();
  
  useEffect(() => {
    // Only update if the props have actually changed
    const nodesChanged = JSON.stringify(prevNodesRef.current) !== JSON.stringify(initialNodes);
    const edgesChanged = JSON.stringify(prevEdgesRef.current) !== JSON.stringify(initialEdges);
    
    if (nodesChanged) {
      setNodes(initialNodes);
      prevNodesRef.current = initialNodes;
    }
    if (edgesChanged) {
      setEdges(initialEdges);
      prevEdgesRef.current = initialEdges;
    }
  }, [initialNodes, initialEdges]);

  useEffect(() => {
    // Only load default flow if no initial nodes/edges provided on first mount and not skipping template
    if (initialNodes.length === 0 && initialEdges.length === 0 && !skipTemplate) {
      async function begin() {
        setNodes((DefaultFlow as any).nodes)
        setEdges((DefaultFlow as any).edges)
      }
      begin()
    }
  }, [])



  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      console.log(JSON.stringify({ nodes: nodes, edges: edges }))
      event.preventDefault();

      if (!ref.current) return;
      
      const pane = ref.current.getBoundingClientRect();
      setMenu({
        id: node.id,
        top: event.clientY < pane.height - 200 ? event.clientY - 100 : 0,
        left: event.clientX < pane.width - 200 ? event.clientX - 300 : 0,
        right: event.clientX >= pane.width - 200 ? pane.width - event.clientX : undefined,
        bottom: event.clientY >= pane.height - 200 ? pane.height - event.clientY : undefined,
      });
    },
    [setMenu],
  );

  // Close the context menu if it's open whenever the window is clicked.
  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: any) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const handleLoadProject = useCallback((nodes: Node[], edges: Edge[], projectId: string, projectName: string) => {
    setNodes(nodes);
    setEdges(edges);
    setCurrentProject(projectId, projectName);
  }, [setCurrentProject]);

  const handleLoadVersion = useCallback((nodes: Node[], edges: Edge[], versionId?: string | null, versionData?: { id: string; slug?: string | null }) => {
    setNodes(nodes);
    setEdges(edges);
    // Call parent callback if provided (for URL hash updates)
    if (onVersionLoad) {
      onVersionLoad(nodes, edges, versionId, versionData);
    }
  }, [onVersionLoad]);

  // Determine if we're in read-only mode (viewing historical version)
  const isReadOnly = readOnly || !!currentVersionSlug;

  // Create a unique key based on nodes and edges to force re-render when versions change
  const flowKey = `${nodes.length}-${edges.length}-${JSON.stringify(nodes.slice(0, 2).map(n => ({id: n.id, pos: n.position})))}`;

  return (
    <div className='flex flex-grow relative'>
        <ReadOnlyProvider isReadOnly={isReadOnly}>
          <ReactFlow
            key={flowKey}
            ref={ref}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={isReadOnly ? undefined : onNodesChange}
            onEdgesChange={isReadOnly ? undefined : onEdgesChange}
            onConnect={isReadOnly ? undefined : onConnect}
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
              🔒 Read-only mode
            </div>
          </div>
        )}
        
        <TopProgressBar loading={loading || loadingVersion} />
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