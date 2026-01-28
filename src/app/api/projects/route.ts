import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify, validateProjectName } from '@/lib/slugify';
import { generateFriendlySlug } from '@/lib/friendlySlug';
import { checkDemoMode } from '@/lib/demoMode';
import { apiLogger } from '@/lib/logger';

async function generateUniqueVersionSlug(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const slug = generateFriendlySlug();
    const existing = await prisma.projectVersion.findUnique({
      where: { slug }
    });
    
    if (!existing) {
      return slug;
    }
    
    attempts++;
  }
  
  // Fallback: add timestamp if we can't generate a unique slug
  return `${generateFriendlySlug()}-${Date.now().toString(36)}`;
}

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
    apiLogger.error('Failed to fetch projects:', error);
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
    apiLogger.error('Failed to create project:', error);
    if (error instanceof Error && (
        error.message.includes('Unique constraint') || 
        error.message.includes('unique constraint') ||
        error.message.includes('projects_name_key') ||
        error.message.includes('projects_slug_key')
      )) {
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}