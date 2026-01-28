import { NextRequest, NextResponse } from 'next/server';
import { getProjectRepository } from '@/repositories/registry';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const repo = getProjectRepository();
    const result = await repo.findVersionsByProjectId(projectId, limit, offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch project versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project versions' },
      { status: 500 }
    );
  }
}
