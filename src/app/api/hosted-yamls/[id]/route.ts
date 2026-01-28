import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

// DELETE a hosted YAML
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Delete from database
    await prisma.hostedYaml.delete({
      where: { id },
    });

    // Try to delete the file (ignore errors if file doesn't exist)
    try {
      const filePath = path.join(process.cwd(), '.next/hosted-yaml', `${id}.yml`);
      await unlink(filePath);
    } catch {
      // File might not exist, ignore
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete hosted YAML:', error);
    return NextResponse.json({ error: 'Failed to delete hosted YAML' }, { status: 500 });
  }
}

// PATCH to update name or associate with project
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { name, projectId } = body;

    const updated = await prisma.hostedYaml.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(projectId !== undefined && { projectId }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update hosted YAML:', error);
    return NextResponse.json({ error: 'Failed to update hosted YAML' }, { status: 500 });
  }
}
