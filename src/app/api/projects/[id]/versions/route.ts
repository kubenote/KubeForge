import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePagination, isValidId } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;

    // Validate project ID format
    if (!isValidId(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const pagination = validatePagination(
      searchParams.get('limit'),
      searchParams.get('offset'),
      { maxLimit: 100 }
    );

    if (pagination.error) {
      return NextResponse.json(
        { error: pagination.error },
        { status: 400 }
      );
    }

    const { limit, offset } = pagination;

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