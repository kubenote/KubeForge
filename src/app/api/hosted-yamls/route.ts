import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all hosted YAMLs (optionally filtered by projectId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const hostedYamls = await prisma.hostedYaml.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(hostedYamls);
  } catch (error) {
    console.error('Failed to fetch hosted YAMLs:', error);
    return NextResponse.json({ error: 'Failed to fetch hosted YAMLs' }, { status: 500 });
  }
}
