import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidFriendlySlug } from '@/lib/friendlySlug';
import { checkDemoMode } from '@/lib/demoMode';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id: projectId, versionId } = await context.params;

    // Try to find by slug first (if it looks like a friendly slug), then fall back to ID
    const isSlug = isValidFriendlySlug(versionId);
    
    const version = await prisma.projectVersion.findFirst({
      where: {
        projectId,
        ...(isSlug ? { slug: versionId } : { id: versionId }),
      },
      include: {
        project: true,
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    const versionData = {
      ...version,
      nodes: JSON.parse(version.nodes),
      edges: JSON.parse(version.edges),
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

    // Try to find by slug first (if it looks like a friendly slug), then fall back to ID
    const isSlug = isValidFriendlySlug(versionId);
    
    const version = await prisma.projectVersion.findFirst({
      where: {
        projectId,
        ...(isSlug ? { slug: versionId } : { id: versionId }),
      },
      include: {
        project: true,
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Delete the version
    await prisma.projectVersion.delete({
      where: {
        id: version.id,
      },
    });

    // Get the remaining versions to return the new latest
    const remainingVersions = await prisma.projectVersion.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    const newLatest = remainingVersions.length > 0 ? remainingVersions[0] : null;

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