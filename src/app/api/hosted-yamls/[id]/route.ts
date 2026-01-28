import { NextRequest, NextResponse } from 'next/server';
import { getHostedYamlRepository } from '@/repositories/registry';
import { getStorageProvider } from '@/storage/registry';

// DELETE a hosted YAML
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const repo = getHostedYamlRepository();
    await repo.delete(id);

    // Try to delete the file
    try {
      const storage = getStorageProvider();
      await storage.delete(id);
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

    const repo = getHostedYamlRepository();
    const updated = await repo.update(id, {
      ...(name !== undefined && { name }),
      ...(projectId !== undefined && { projectId }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update hosted YAML:', error);
    return NextResponse.json({ error: 'Failed to update hosted YAML' }, { status: 500 });
  }
}
