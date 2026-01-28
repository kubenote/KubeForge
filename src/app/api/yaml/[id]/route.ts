import { NextRequest, NextResponse } from 'next/server';
import { getHostedYamlRepository } from '@/repositories/registry';
import { getStorageProvider } from '@/storage/registry';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  const id = rawId.replace(/\.yml$/, ''); // strip .yml extension if included

  if (!id) {
    return new NextResponse('Missing id', { status: 400 });
  }

  try {
    const storage = getStorageProvider();
    const file = await storage.read(id);

    // Increment view count in database (fire and forget)
    const repo = getHostedYamlRepository();
    repo.incrementViewCount(id).catch(() => {
      // Ignore errors (e.g., if record doesn't exist in DB yet)
    });

    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
      },
    });
  } catch {
    return new NextResponse('File not found', { status: 404 });
  }
}
