/**
 * React Hook for Project Data Management
 * Provides a clean interface for components to manage project data
 */

import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { ProjectDataService, ProjectData, ProjectVersion } from '@/services/project.data.service';
import { useProject } from '@/contexts/ProjectContext';

export interface UseProjectDataManagerReturn {
  // State
  loading: boolean;
  saving: boolean;
  error: string | null;
  
  // Current data
  currentProject: ProjectData | null;
  currentNodes: Node[];
  currentEdges: Edge[];
  currentVersionId: string | null;
  currentVersionSlug: string | null;
  
  // Actions
  createProject: (name: string, nodes: Node[], edges: Edge[], message?: string) => Promise<void>;
  updateProject: (nodes: Node[], edges: Edge[], message?: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  loadProjectVersion: (projectId: string, versionId: string) => Promise<void>;
  setCurrentData: (nodes: Node[], edges: Edge[], versionId?: string | null, versionSlug?: string | null) => void;
  clearError: () => void;
  reset: () => void;
  getCurrentProjectInfo: () => { id: string | undefined; name: string | undefined; hasProject: boolean };
}

export function useProjectDataManager(): UseProjectDataManagerReturn {
  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [currentNodes, setCurrentNodes] = useState<Node[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [currentVersionSlug, setCurrentVersionSlug] = useState<string | null>(null);
  
  // Context
  const { setCurrentProject: setProjectContext, navigateToProject, currentProjectId: contextProjectId, currentProjectName: contextProjectName } = useProject();

  // Get current project info from state or context
  const getCurrentProjectInfo = useCallback(() => {
    return {
      id: currentProject?.id || contextProjectId,
      name: currentProject?.name || contextProjectName,
      hasProject: !!(currentProject?.id || contextProjectId)
    };
  }, [currentProject, contextProjectId, contextProjectName]);

  // Create a new project
  const createProject = useCallback(async (name: string, nodes: Node[], edges: Edge[], message?: string) => {
    try {
      setSaving(true);
      setError(null);
      
      // Validate data
      const validation = ProjectDataService.validateProjectData(nodes, edges);
      if (!validation.isValid) {
        throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
      }

      // Create project
      const project = await ProjectDataService.createProject({
        name,
        nodes,
        edges,
        message
      });

      // Update state
      setCurrentProject(project);
      setCurrentNodes(nodes);
      setCurrentEdges(edges);
      setCurrentVersionId(null); // Latest version
      setCurrentVersionSlug(null);
      
      // Update context
      setProjectContext(project.id, project.name, project.slug);
      
      // Navigate to project
      navigateToProject(project.slug);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      console.error('Create project error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [setProjectContext, navigateToProject]);

  // Update existing project
  const updateProject = useCallback(async (nodes: Node[], edges: Edge[], message?: string) => {
    const projectInfo = getCurrentProjectInfo();
    
    console.log('🔄 updateProject: Project info check', {
      currentProjectId: currentProject?.id,
      contextProjectId,
      projectInfoId: projectInfo.id,
      hasProject: projectInfo.hasProject
    });
    
    if (!projectInfo.hasProject || !projectInfo.id) {
      throw new Error('No current project to update');
    }

    try {
      setSaving(true);
      setError(null);
      
      // Validate data
      const validation = ProjectDataService.validateProjectData(nodes, edges);
      if (!validation.isValid) {
        throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
      }

      // Update project
      const updatedProject = await ProjectDataService.updateProject(projectInfo.id, {
        nodes,
        edges,
        message
      });

      // Update state
      setCurrentProject(updatedProject);
      setCurrentNodes(nodes);
      setCurrentEdges(edges);
      setCurrentVersionId(null); // Latest version after update
      setCurrentVersionSlug(null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      console.error('Update project error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getCurrentProjectInfo]);

  // Load a project (latest version)
  const loadProject = useCallback(async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);

      const project = await ProjectDataService.loadProject(projectId);
      
      // Update state
      setCurrentProject(project);
      setCurrentNodes(project.nodes);
      setCurrentEdges(project.edges);
      setCurrentVersionId(null); // Latest version
      setCurrentVersionSlug(null);
      
      // Update context
      setProjectContext(project.id, project.name, project.slug);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      console.error('Load project error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setProjectContext]);

  // Load a specific version of a project
  const loadProjectVersion = useCallback(async (projectId: string, versionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const version = await ProjectDataService.loadProjectVersion(projectId, versionId);
      
      // Update state
      setCurrentNodes(version.nodes);
      setCurrentEdges(version.edges);
      setCurrentVersionId(version.id);
      setCurrentVersionSlug(version.slug ?? null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project version';
      console.error('Load project version error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Set current data directly (for external updates)
  const setCurrentData = useCallback((nodes: Node[], edges: Edge[], versionId?: string | null, versionSlug?: string | null) => {
    console.log('🔄 useProjectDataManager: Setting current data', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      versionId,
      versionSlug
    });
    
    setCurrentNodes(nodes);
    setCurrentEdges(edges);
    setCurrentVersionId(versionId || null);
    setCurrentVersionSlug(versionSlug || null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setCurrentProject(null);
    setCurrentNodes([]);
    setCurrentEdges([]);
    setCurrentVersionId(null);
    setCurrentVersionSlug(null);
    setError(null);
    setLoading(false);
    setSaving(false);
  }, []);

  return {
    // State
    loading,
    saving,
    error,
    
    // Current data
    currentProject,
    currentNodes,
    currentEdges,
    currentVersionId,
    currentVersionSlug,
    
    // Actions
    createProject,
    updateProject,
    loadProject,
    loadProjectVersion,
    setCurrentData,
    clearError,
    reset,
    getCurrentProjectInfo,
  };
}