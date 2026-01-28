import { NextRequest, NextResponse } from 'next/server';
import { getProjectRepository } from '@/repositories/registry';
import { isValidFriendlySlug } from '@/lib/friendlySlug';
import { checkDemoMode } from '@/lib/demoMode';
import { safeJsonParse } from '@/lib/safeJson';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id: projectId, versionId } = await context.params;
    const isSlug = isValidFriendlySlug(versionId);

    const repo = getProjectRepository();
    const version = await repo.findVersion(projectId, versionId, isSlug);

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    const versionData = {
      ...version,
      nodes: safeJsonParse(version.nodes, []),
      edges: safeJsonParse(version.edges, []),
    };

    return NextResponse.json(versionData);
  } catch (error) {
    console.error('Failed to fetch project version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project version' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    // Check if demo mode is enabled
    checkDemoMode();

    const { id: projectId, versionId } = await context.params;
    const isSlug = isValidFriendlySlug(versionId);

    const repo = getProjectRepository();
    const version = await repo.findVersion(projectId, versionId, isSlug);

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    await repo.deleteVersion(version.id);

    const newLatest = await repo.findLatestVersion(projectId);

    return NextResponse.json({
      success: true,
      deletedVersionId: version.id,
      newLatestVersion: newLatest ? {
        id: newLatest.id,
        slug: newLatest.slug,
        createdAt: newLatest.createdAt,
      } : null,
    });
  } catch (error) {
    console.error('Failed to delete project version:', error);
    if (error instanceof Error && error.message.includes('demo mode')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete project version' },
      { status: 500 }
    );
  }
}
