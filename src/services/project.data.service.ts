/**
 * Centralized Project Data Management Service
 * Handles project mutations (create, update, delete) and imperative loads.
 * For cached reads, use SWR hooks: useProjects, useProject, useProjectVersions.
 */

import { Node, Edge } from '@xyflow/react';
import { DEMO_MODE_MESSAGE } from '@/lib/demoMode';
import { projectUrls } from '@/lib/apiUrls';

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
    const response = await fetch(projectUrls.list(), {
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
      if (errorMessage.includes('demo mode')) {
        throw new Error(DEMO_MODE_MESSAGE);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
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
    const response = await fetch(projectUrls.get(projectId), {
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
      if (errorMessage.includes('demo mode')) {
        throw new Error(DEMO_MODE_MESSAGE);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
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
   * Load project data (latest version) — imperative, for one-shot loads
   */
  static async loadProject(projectId: string): Promise<ProjectData> {
    const response = await fetch(projectUrls.get(projectId));
    if (!response.ok) {
      throw new Error('Failed to load project');
    }

    const result = await response.json();
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
   * Load a specific version of a project — imperative, for one-shot loads
   */
  static async loadProjectVersion(projectId: string, versionId: string): Promise<ProjectVersion> {
    const response = await fetch(projectUrls.version(projectId, versionId));
    if (!response.ok) {
      throw new Error('Failed to load project version');
    }

    const result = await response.json();
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
   * Delete a project
   */
  static async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(projectUrls.get(projectId), {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || 'Failed to delete project';
      if (errorMessage.includes('demo mode')) {
        throw new Error(DEMO_MODE_MESSAGE);
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a project version
   */
  static async deleteVersion(projectId: string, versionId: string): Promise<{ newLatestVersion?: { id: string; slug?: string | null; createdAt: string } | null }> {
    const response = await fetch(projectUrls.version(projectId, versionId), {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || 'Failed to delete version';
      if (errorMessage.includes('demo mode')) {
        throw new Error(DEMO_MODE_MESSAGE);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return { newLatestVersion: result.newLatestVersion };
  }

  /**
   * Validate nodes and edges data before saving
   */
  static validateProjectData(nodes: Node[], edges: Edge[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(nodes)) {
      errors.push('Nodes must be an array');
    } else {
      nodes.forEach((node, index) => {
        if (!node.id) errors.push(`Node at index ${index} is missing an ID`);
        if (!node.type) errors.push(`Node ${node.id} is missing a type`);
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          errors.push(`Node ${node.id} has invalid position`);
        }
      });
    }

    if (!Array.isArray(edges)) {
      errors.push('Edges must be an array');
    } else {
      edges.forEach((edge, index) => {
        if (!edge.id) errors.push(`Edge at index ${index} is missing an ID`);
        if (!edge.source || !edge.target) errors.push(`Edge ${edge.id} is missing source or target`);
      });
    }

    return { isValid: errors.length === 0, errors };
  }
}