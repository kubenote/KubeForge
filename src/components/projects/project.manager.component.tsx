'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, FolderOpen, Plus, Trash2, History, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Node, Edge } from '@xyflow/react';
import { validateProjectName, slugify } from '@/lib/slugify';
import { useProject } from '@/contexts/project.context';
import { useProjectDataManager } from '@/hooks/use-project-data-manager.hook';
import { useDemoMode } from '@/contexts/demo-mode.context';
import { useProjects } from '@/hooks/use-projects.hook';

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  versions: ProjectVersion[];
}

interface ProjectVersion {
  id: string;
  createdAt: string;
  message: string | null;
}

interface ProjectManagerProps {
  currentNodes: Node[];
  currentEdges: Edge[];
  onLoadProject: (nodes: Node[], edges: Edge[], projectId: string, projectName: string) => void;
  currentProjectId?: string;
  getCurrentNodesEdges?: () => { nodes: Node[]; edges: Edge[] };
}

export function ProjectManager({ currentNodes, currentEdges, onLoadProject, currentProjectId, getCurrentNodesEdges }: ProjectManagerProps) {
  const { navigateToProject } = useProject();
  const dataManager = useProjectDataManager();
  const { isDemoMode } = useDemoMode();
  const { data: projectsData, refetch: refetchProjects } = useProjects();
  const projects = (projectsData || []) as Project[];
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [nameError, setNameError] = useState('');

  const handleSaveProject = async () => {
    if (!projectName.trim()) return;
    
    try {
      // Clear previous errors
      setNameError('');
      
      // Validate project name
      const validatedName = validateProjectName(projectName);
      const slug = slugify(validatedName);
      
      if (!slug) {
        setNameError('Project name must contain at least one alphanumeric character');
        return;
      }

      // Get current state from Flow component if available, otherwise use props
      const currentState = getCurrentNodesEdges ? getCurrentNodesEdges() : { nodes: currentNodes, edges: currentEdges };
      const isUpdate = currentProjectId && projects.some(p => p.id === currentProjectId);
      const message = saveMessage || (isUpdate ? 'Updated project' : 'Initial version');

      if (isUpdate) {
        // Update existing project
        await dataManager.updateProject(currentState.nodes, currentState.edges, message);
      } else {
        // Create new project
        await dataManager.createProject(validatedName, currentState.nodes, currentState.edges, message);
      }

      // Success - clean up UI
      setSaveDialogOpen(false);
      setProjectName('');
      setSaveMessage('');
      refetchProjects(true);
      
      // Notify parent component
      if (onLoadProject) {
        onLoadProject(currentState.nodes, currentState.edges, currentProjectId || '', validatedName);
      }
      
    } catch (error: any) {
      console.error('Failed to save project:', error);
      setNameError(error.message || 'Failed to save project');
    }
  };

  const currentProject = projects.find(p => p.id === currentProjectId);


  return (
    <div className="flex items-center space-x-2">


      {/* Save Button */}
      <Dialog open={saveDialogOpen} onOpenChange={(open) => {
        setSaveDialogOpen(open);
        if (!open) {
          setNameError('');
        }
      }}>
        <DialogTrigger asChild>
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={isDemoMode}
                    onClick={() => {
                      if (currentProject) {
                        setProjectName(currentProject.name);
                      }
                    }}
                  >
                    <Save className="w-4 h-4" />
                    {currentProject ? '' : 'Save As'}
                  </Button>
                </TooltipTrigger>
                {isDemoMode && (
                  <TooltipContent>
                    <p>Saving is disabled in demo mode</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentProject ? 'Save Project' : 'Save New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Project name"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  if (nameError) setNameError('');
                }}
                className={nameError ? 'border-red-500' : ''}
              />
              {nameError && (
                <p className="text-sm text-red-500 mt-1">{nameError}</p>
              )}
            </div>
            <Input
              placeholder="Save message (optional)"
              value={saveMessage}
              onChange={(e) => setSaveMessage(e.target.value)}
            />
            <Button onClick={handleSaveProject} disabled={!projectName.trim() || dataManager.saving}>
              {dataManager.saving ? 'Saving...' : (currentProject ? 'Save Version' : 'Create Project')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}