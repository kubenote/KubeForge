import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify, validateProjectName } from '@/lib/slugify';
import { generateFriendlySlug } from '@/lib/friendlySlug';
import { checkDemoMode } from '@/lib/demoMode';
import { safeJsonParse } from '@/lib/safeJson';

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

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
    console.error('Failed to fetch project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
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

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Validate and create slug if name is provided
    let validatedName = existingProject.name;
    let slug = existingProject.slug;
    
    if (name && name !== existingProject.name) {
      validatedName = validateProjectName(name);
      slug = slugify(validatedName);
      
      if (!slug) {
        return NextResponse.json(
          { error: 'Project name must contain at least one alphanumeric character' },
          { status: 400 }
        );
      }
    }

    // Update project and create new version
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: validatedName,
        slug: slug,
        versions: nodes && edges ? {
          create: {
            slug: await generateUniqueVersionSlug(),
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges),
            message: message || 'Updated version',
          },
        } : undefined,
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Failed to update project:', error);
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
      { error: 'Failed to update project' },
      { status: 500 }
    );
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

    const deletedProject = await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedProject });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}