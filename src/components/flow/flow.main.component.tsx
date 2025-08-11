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
import * as DefaultFlow from '../data/defaultFlow.json'
import { useNodeProvider } from 'components/providers/NodeProvider';

const nodeTypes = {
  KindNode: KindNode,
  ObjectRefNode: ObjectRefNode
};


export default function Flow() {

  const { version } = useVersion();
  const { setSchemaGvks } = useSchema();
  const { getSchema } = useNodeProvider()
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
    right?: number;
    bottom?: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    async function begin() {
      setNodes(DefaultFlow.nodes)
      setEdges(DefaultFlow.edges)
    }
    begin()
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

  return (
    <div className='flex flex-grow'>
      <ReactFlow
        ref={ref}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
      </ReactFlow>
      <TopProgressBar loading={loading} />

    </div>
  );
}