import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  const id = rawId.replace(/\.yml$/, ''); // strip .yml extension if included

  if (!id) {
    return new NextResponse('Missing id', { status: 400 });
  }

  const filePath = path.join(process.cwd(), '.next/hosted-yaml', `${id}.yml`);

  try {
    const file = await readFile(filePath, 'utf8');

    // Increment view count in database (fire and forget)
    prisma.hostedYaml.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    }).catch(() => {
      // Ignore errors (e.g., if record doesn't exist in DB yet)
    });

    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
      },
    });
  } catch (err) {
    return new NextResponse('File not found', { status: 404 });
  }
}
