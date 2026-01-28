import { NextRequest, NextResponse } from 'next/server';
import { getProjectRepository } from '@/repositories/registry';
import { safeJsonParse } from '@/lib/safeJson';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const repo = getProjectRepository();
    const project = await repo.findBySlug(slug);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
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
    console.error('Failed to fetch project by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}
