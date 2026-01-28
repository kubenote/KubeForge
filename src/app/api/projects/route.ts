import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify, validateProjectName } from '@/lib/slugify';
import { checkDemoMode } from '@/lib/demoMode';
import {
  generateUniqueVersionSlug,
  isUniqueConstraintError,
  uniqueConstraintErrorResponse,
  internalErrorResponse,
  badRequestResponse
} from '@/lib/projectUtils';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            versions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check if demo mode is enabled
    checkDemoMode();
    
    const { name, nodes, edges, message } = await req.json();

    if (!name || !nodes || !edges) {
      return NextResponse.json(
        { error: 'Missing required fields: name, nodes, edges' },
        { status: 400 }
      );
    }

    // Validate and create slug from project name
    const validatedName = validateProjectName(name);
    const slug = slugify(validatedName);
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Project name must contain at least one alphanumeric character' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: validatedName,
        slug: slug,
        versions: {
          create: {
            slug: await generateUniqueVersionSlug(),
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges),
            message: message || 'Initial version',
          },
        },
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to create project:', error);
    if (isUniqueConstraintError(error)) {
      return uniqueConstraintErrorResponse();
    }
    return internalErrorResponse('Failed to create project');
  }
}