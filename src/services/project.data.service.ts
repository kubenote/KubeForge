/**
 * Centralized Project Data Management Service
 * Handles all project creation, updating, loading, and version management
 */

import { Node, Edge } from '@xyflow/react';
import { DEMO_MODE_MESSAGE } from '@/lib/demoMode';
import { serviceLogger } from '@/lib/logger';

export interface ProjectData {
  id: string;
  name: string;
  slug: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
  currentVersionId?: string;
}

export interface ProjectVersion {
  id: string;
  slug?: string | null;
  projectId: string;
  nodes: Node[];
  edges: Edge[];
  message: string | null;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  nodes: Node[];
  edges: Edge[];
  message?: string;
}

export interface UpdateProjectRequest {
  nodes: Node[];
  edges: Edge[];
  message?: string;
}

export class ProjectDataService {
  
  /**
   * Create a new project with initial nodes and edges
   */
  static async createProject(request: CreateProjectRequest): Promise<ProjectData> {
    serviceLogger.debug('ProjectDataService: Creating project', {
      name: request.name,
      nodeCount: request.nodes.length,
      edgeCount: request.edges.length,
      nodesPreview: request.nodes.slice(0, 2).map(n => ({ id: n.id, type: n.type }))
    });

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: request.name,
        nodes: request.nodes,
        edges: request.edges,
        message: request.message || 'Initial version',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || 'Failed to create project';
      
      // Check if it's a demo mode error and provide user-friendly message
      if (errorMessage.includes('demo mode')) {
        throw new Error(DEMO_MODE_MESSAGE);
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    serviceLogger.debug('ProjectDataService: Project created', {
      id: result.id,
      slug: result.slug,
      versionCount: result.versions?.length || 0
    });

    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      nodes: request.nodes,
      edges: request.edges,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Update an existing project (creates a new version)
   */
  static async updateProject(projectId: string, request: UpdateProjectRequest): Promise<ProjectData> {
    serviceLogger.debug('ProjectDataService: Updating project', {
      projectId,
      nodeCount: request.nodes.length,
      edgeCount: request.edges.length,
      nodesPreview: request.nodes.slice(0, 2).map(n => ({ id: n.id, type: n.type }))
    });

    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: request.nodes,
        edges: request.edges,
        message: request.message || 'Updated project',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || 'Failed to update project';
      
      // Check if it's a demo mode error and provide user-friendly message
      if (errorMessage.includes('demo mode')) {
        throw new Error(DEMO_MODE_MESSAGE);
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    serviceLogger.debug('ProjectDataService: Project updated', {
      id: result.id,
      slug: result.slug,
      latestVersionSlug: result.versions?.[0]?.slug
    });

    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      nodes: request.nodes,
      edges: request.edges,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Load project data (latest version)
   */
  static async loadProject(projectId: string): Promise<ProjectData> {
    serviceLogger.debug('ProjectDataService: Loading project', { projectId });

    const response = await fetch(`/api/projects/${projectId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load project');
    }

    const result = await response.json();
    serviceLogger.debug('ProjectDataService: Project loaded', {
      id: result.id,
      nodeCount: result.nodes?.length || 0,
      edgeCount: result.edges?.length || 0
    });

    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      nodes: result.nodes || [],
      edges: result.edges || [],
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Load a specific version of a project
   */
  static async loadProjectVersion(projectId: string, versionId: string): Promise<ProjectVersion> {
    serviceLogger.debug('ProjectDataService: Loading project version', { projectId, versionId });

    const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load project version');
    }

    const result = await response.json();
    serviceLogger.debug('ProjectDataService: Version loaded', {
      id: result.id,
      slug: result.slug,
      nodeCount: result.nodes?.length || 0,
      edgeCount: result.edges?.length || 0
    });

    return {
      id: result.id,
      slug: result.slug,
      projectId: result.projectId,
      nodes: result.nodes || [],
      edges: result.edges || [],
      message: result.message,
      createdAt: result.createdAt,
    };
  }

  /**
   * Get all versions for a project
   */
  static async getProjectVersions(projectId: string, limit = 20): Promise<{ versions: ProjectVersion[], totalVersions: number }> {
    serviceLogger.debug('ProjectDataService: Getting project versions', { projectId, limit });

    const response = await fetch(`/api/projects/${projectId}/versions?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to load project versions');
    }

    const result = await response.json();
    serviceLogger.debug('ProjectDataService: Versions loaded', {
      count: result.versions?.length || 0,
      total: result.totalVersions
    });

    return {
      versions: result.versions.map((v: any) => ({
        id: v.id,
        slug: v.slug,
        projectId: v.projectId,
        nodes: Array.isArray(v.nodes) ? v.nodes : (v.nodes ? JSON.parse(v.nodes) : []),
        edges: Array.isArray(v.edges) ? v.edges : (v.edges ? JSON.parse(v.edges) : []),
        message: v.message,
        createdAt: v.createdAt,
      })),
      totalVersions: result.totalVersions,
    };
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: string): Promise<void> {
    serviceLogger.debug('ProjectDataService: Deleting project', { projectId });

    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || 'Failed to delete project';
      
      // Check if it's a demo mode error and provide user-friendly message
      if (errorMessage.includes('demo mode')) {
        throw new Error(DEMO_MODE_MESSAGE);
      }
      
      throw new Error(errorMessage);
    }

    serviceLogger.debug('ProjectDataService: Project deleted successfully');
  }

  /**
   * Delete a project version
   */
  static async deleteVersion(projectId: string, versionId: string): Promise<{ newLatestVersion?: { id: string; slug?: string | null; createdAt: string } | null }> {
    serviceLogger.debug('ProjectDataService: Deleting version', { projectId, versionId });

    const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || 'Failed to delete version';
      
      // Check if it's a demo mode error and provide user-friendly message
      if (errorMessage.includes('demo mode')) {
        throw new Error(DEMO_MODE_MESSAGE);
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    serviceLogger.debug('ProjectDataService: Version deleted successfully', {
      deletedVersionId: result.deletedVersionId,
      newLatestVersion: result.newLatestVersion
    });

    return {
      newLatestVersion: result.newLatestVersion
    };
  }

  /**
   * Validate nodes and edges data before saving
   */
  static validateProjectData(nodes: Node[], edges: Edge[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate nodes
    if (!Array.isArray(nodes)) {
      errors.push('Nodes must be an array');
    } else {
      nodes.forEach((node, index) => {
        if (!node.id) {
          errors.push(`Node at index ${index} is missing an ID`);
        }
        if (!node.type) {
          errors.push(`Node ${node.id} is missing a type`);
        }
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          errors.push(`Node ${node.id} has invalid position`);
        }
      });
    }

    // Validate edges
    if (!Array.isArray(edges)) {
      errors.push('Edges must be an array');
    } else {
      edges.forEach((edge, index) => {
        if (!edge.id) {
          errors.push(`Edge at index ${index} is missing an ID`);
        }
        if (!edge.source || !edge.target) {
          errors.push(`Edge ${edge.id} is missing source or target`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * React hook for project data management
 */
export function useProjectData() {
  return {
    createProject: ProjectDataService.createProject,
    updateProject: ProjectDataService.updateProject,
    loadProject: ProjectDataService.loadProject,
    loadProjectVersion: ProjectDataService.loadProjectVersion,
    getProjectVersions: ProjectDataService.getProjectVersions,
    validateProjectData: ProjectDataService.validateProjectData,
  };
}