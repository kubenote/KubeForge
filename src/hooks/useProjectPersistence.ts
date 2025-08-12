import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';

interface UseProjectPersistenceReturn {
  currentProjectId: string;
  currentProjectName: string;
  saveProject: (name: string, nodes: Node[], edges: Edge[], message?: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<{ nodes: Node[]; edges: Edge[]; name: string }>;
  updateProject: (nodes: Node[], edges: Edge[], message?: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setCurrentProject: (id: string, name: string) => void;
  clearCurrentProject: () => void;
}

export function useProjectPersistence(): UseProjectPersistenceReturn {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [currentProjectName, setCurrentProjectName] = useState<string>('');

  const saveProject = useCallback(async (name: string, nodes: Node[], edges: Edge[], message?: string) => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        nodes,
        edges,
        message: message || 'Initial version',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save project');
    }

    const savedProject = await response.json();
    setCurrentProjectId(savedProject.id);
    setCurrentProjectName(savedProject.name);
    return savedProject;
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load project');
    }

    const project = await response.json();
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    
    return {
      nodes: project.nodes || [],
      edges: project.edges || [],
      name: project.name,
    };
  }, []);

  const updateProject = useCallback(async (nodes: Node[], edges: Edge[], message?: string) => {
    if (!currentProjectId) {
      throw new Error('No current project to update');
    }

    const response = await fetch(`/api/projects/${currentProjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes,
        edges,
        message: message || 'Updated version',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }

    return response.json();
  }, [currentProjectId]);

  const deleteProject = useCallback(async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete project');
    }

    if (currentProjectId === projectId) {
      setCurrentProjectId('');
      setCurrentProjectName('');
    }

    return response.json();
  }, [currentProjectId]);

  const setCurrentProject = useCallback((id: string, name: string) => {
    setCurrentProjectId(id);
    setCurrentProjectName(name);
  }, []);

  const clearCurrentProject = useCallback(() => {
    setCurrentProjectId('');
    setCurrentProjectName('');
  }, []);

  return {
    currentProjectId,
    currentProjectName,
    saveProject,
    loadProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    clearCurrentProject,
  };
}