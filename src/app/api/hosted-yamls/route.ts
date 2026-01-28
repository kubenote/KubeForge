import { NextRequest, NextResponse } from 'next/server';
import { getHostedYamlRepository } from '@/repositories/registry';

// GET all hosted YAMLs (optionally filtered by projectId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const repo = getHostedYamlRepository();
    const hostedYamls = await repo.findAll(projectId);

    return NextResponse.json(hostedYamls);
  } catch (error) {
    console.error('Failed to fetch hosted YAMLs:', error);
    return NextResponse.json({ error: 'Failed to fetch hosted YAMLs' }, { status: 500 });
  }
}
