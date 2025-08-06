'use client';

import { useState, useCallback, use, useEffect, useRef } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useVersion } from '../../providers/VersionProvider';
import { ConfigNode } from './nodes/standard.node';
import { ObjectRefNode } from './nodes/objectRef.node';
import ContextMenu from './nodeContextMenu';
import { TopProgressBar } from '../ui/progress-bar';
import { useSchema } from 'components/providers/SchemaProvider';

const initialNodes = [];
const initialEdges = [];

const nodeTypes = {
  ConfigNode: ConfigNode,
  ObjectRefNode: ObjectRefNode
};


export default function Flow() {

  const { version, setVersion, setSchemaData, setPreRefSchemaData } = useVersion();
  const { setSchemaGvks } = useSchema();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [menu, setMenu] = useState(null);
  const ref = useRef(null);
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!version) return;

    setLoading(true)
    fetch(`/api/schema/load?version=${version}`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
        setSchemaGvks(data.gvks)
        setSchemaData(data.ref);
        setPreRefSchemaData(data.preRef);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        setLoading(false)
      })
  }, [version])


  const onNodeContextMenu = useCallback(
    (event, node) => {
      console.log(JSON.stringify({ nodes: nodes, edges: edges }))
      event.preventDefault();

      const pane = ref.current.getBoundingClientRect();
      setMenu({
        id: node.id,
        top: event.clientY < pane.height - 200 && event.clientY - 100,
        left: event.clientX < pane.width - 200 && event.clientX - 300,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
      });
    },
    [setMenu],
  );

  // Close the context menu if it's open whenever the window is clicked.
  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);



  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
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