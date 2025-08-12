import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { checkDemoMode } from '@/lib/demoMode';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};

export async function POST(req: NextRequest) {
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method not allowed' });
    }

    try {
        // Check if demo mode is enabled
        checkDemoMode();
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'URL generation is disabled in demo mode' },
            { status: 403 }
        );
    }

    const { yamlContent } = await req.json();

    if (!yamlContent || typeof yamlContent !== 'string') {
        return NextResponse.json({ error: 'Missing yamlContent' });
    }

    const id = nanoid();
    const cacheDir = path.join(process.cwd(), '.next/hosted-yaml');
    const filePath = path.join(cacheDir, `${id}.yml`);

    try {
        await mkdir(cacheDir, { recursive: true });
        await writeFile(filePath, yamlContent, 'utf8');
        return NextResponse.json({ url: `/api/yaml/${id}.yml`, id });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to save file' });
    }
}
