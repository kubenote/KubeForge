'use client';

import { useState } from 'react';
import { Node, Edge, ReactFlowProvider } from '@xyflow/react';
import Flow from "@/components/flow/flow.main.component";
import MainSidebar from "@/components/sidebar/sidebar.main.component";
import { NodeProvider } from '@/providers/node.provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Zap } from 'lucide-react';
import ExportDialog from '@/components/dialog/dialog.export.component';

interface NewProjectClientProps {
  topics: string[];
  versions: any;
}

export function NewProjectClient({ topics, versions }: NewProjectClientProps) {
  const [currentNodes, setCurrentNodes] = useState<Node[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);
  const [getCurrentFlowState, setGetCurrentFlowState] = useState<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(true);
  const [skipTemplate, setSkipTemplate] = useState(false);
  const [templateChoiceMade, setTemplateChoiceMade] = useState(false);

  const handleLoadProject = (nodes: Node[], edges: Edge[], projectId: string, projectName: string) => {
    setCurrentNodes(nodes);
    setCurrentEdges(edges);
  };

  const handleGetFlowState = (callback: () => { nodes: Node[]; edges: Edge[] }) => {
    setGetCurrentFlowState(() => callback);
  };

  // Function to get current nodes/edges from Flow component instead of stale props
  const getCurrentNodesEdges = () => {
    if (getCurrentFlowState) {
      return getCurrentFlowState();
    }
    // Fallback to props if callback not available
    return { nodes: currentNodes, edges: currentEdges };
  };

  const handleTemplateChoice = (useTemplate: boolean) => {
    setSkipTemplate(!useTemplate);
    setTemplateChoiceMade(true);
    setShowTemplateDialog(false);
  };

  return (
    <ReactFlowProvider>
      <NodeProvider>
        {/* Template Choice Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Would you like to start with a template or from scratch?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center space-y-2"
                  onClick={() => handleTemplateChoice(true)}
                >
                  <FileText className="w-6 h-6" />
                  <span>Template</span>
                  <span className="text-xs text-muted-foreground">Start with example</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center space-y-2"
                  onClick={() => handleTemplateChoice(false)}
                >
                  <Zap className="w-6 h-6" />
                  <span>Scratch</span>
                  <span className="text-xs text-muted-foreground">Empty canvas</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <MainSidebar
          topics={topics}
          versions={versions}
          currentNodes={currentNodes}
          currentEdges={currentEdges}
          currentVersionSlug={null}
          onLoadProject={handleLoadProject}
          getCurrentNodesEdges={getCurrentNodesEdges}
          toolbarExtra={<ExportDialog />}
        >
          {/* Only render Flow after template choice is made */}
          {templateChoiceMade && (
            <Flow
              onGetCurrentState={handleGetFlowState}
              skipTemplate={skipTemplate}
            />
          )}
        </MainSidebar>
      </NodeProvider>
    </ReactFlowProvider>
  );
}