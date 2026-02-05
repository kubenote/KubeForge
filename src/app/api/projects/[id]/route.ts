import { NextRequest, NextResponse } from 'next/server';
import { getProjectRepository } from '@/repositories/registry';
import { slugify, validateProjectName } from '@/lib/slugify';
import { checkDemoMode } from '@/lib/demoMode';
import { safeJsonParse } from '@/lib/safeJson';
import {
  generateUniqueVersionSlug,
  isUniqueConstraintError,
  uniqueConstraintErrorResponse,
  internalErrorResponse,
  notFoundResponse,
  badRequestResponse
} from '@/lib/projectUtils';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const repo = getProjectRepository();
    const project = await repo.findById(id);

    if (!project) {
      return notFoundResponse('Project');
    }

    // Parse the latest version's nodes and edges
    const latestVersion = project.versions[0];
    if (latestVersion) {
      const projectData = {
        ...project,
        nodes: safeJsonParse(latestVersion.nodes, []),
        edges: safeJsonParse(latestVersion.edges, []),
      };
      return NextResponse.json(projectData);
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return internalErrorResponse('Failed to fetch project');
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check if demo mode is enabled
    checkDemoMode();

    const { id } = await context.params;
    const { name, nodes, edges, message } = await req.json();

    const repo = getProjectRepository();

    // For auto-save (nodes+edges only, no rename), skip the findById lookup
    if (nodes && edges && !name) {
      try {
        const updatedProject = await repo.update(id, {
          newVersion: {
            slug: await generateUniqueVersionSlug(),
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges),
            message: message || 'Updated version',
          },
        });
        return NextResponse.json(updatedProject);
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return uniqueConstraintErrorResponse();
        }
        // Prisma P2025 = record not found
        if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
          return notFoundResponse('Project');
        }
        throw error;
      }
    }

    const existingProject = await repo.findById(id);

    if (!existingProject) {
      return notFoundResponse('Project');
    }

    // Validate and create slug if name is provided
    let validatedName = existingProject.name;
    let slug = existingProject.slug;

    if (name && name !== existingProject.name) {
      validatedName = validateProjectName(name);
      slug = slugify(validatedName);

      if (!slug) {
        return badRequestResponse('Project name must contain at least one alphanumeric character');
      }
    }

    const updatedProject = await repo.update(id, {
      name: validatedName,
      slug,
      newVersion: nodes && edges ? {
        slug: await generateUniqueVersionSlug(),
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        message: message || 'Updated version',
      } : undefined,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Failed to update project:', error);
    if (isUniqueConstraintError(error)) {
      return uniqueConstraintErrorResponse();
    }
    return internalErrorResponse('Failed to update project');
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check if demo mode is enabled
    checkDemoMode();

    const { id } = await context.params;
    const repo = getProjectRepository();
    const deletedProject = await repo.delete(id);

    return NextResponse.json({ success: true, deletedProject });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return internalErrorResponse('Failed to delete project');
  }
}
