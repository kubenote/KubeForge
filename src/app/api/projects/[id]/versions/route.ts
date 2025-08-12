import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const versions = await prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const totalVersions = await prisma.projectVersion.count({
      where: { projectId },
    });

    return NextResponse.json({
      versions,
      totalVersions,
      hasMore: offset + versions.length < totalVersions,
    });
  } catch (error) {
    console.error('Failed to fetch project versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project versions' },
      { status: 500 }
    );
  }
}