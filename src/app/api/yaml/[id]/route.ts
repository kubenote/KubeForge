import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(
  req: NextRequest,
  context: any
) {
  const id = context.params.id.replace(/\.yml$/, ''); // strip .yml extension if included

  if (!id) {
    return new NextResponse('Missing id', { status: 400 });
  }

  const filePath = path.join(process.cwd(), '.next/hosted-yaml', `${id}.yml`);

  try {
    const file = await readFile(filePath, 'utf8');
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
