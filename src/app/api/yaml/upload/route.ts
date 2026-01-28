import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { checkDemoMode } from '@/lib/demoMode';
import { validateKubernetesYaml } from '@/lib/yamlValidation';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};

export async function POST(req: NextRequest) {
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
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

    let requestBody: { yamlContent?: unknown };
    try {
        requestBody = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { yamlContent } = requestBody;

    if (!yamlContent || typeof yamlContent !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid yamlContent' }, { status: 400 });
    }

    // Validate and sanitize the YAML content
    const validation = validateKubernetesYaml(yamlContent);
    if (!validation.isValid) {
        return NextResponse.json(
            { error: 'Invalid YAML content', details: validation.errors },
            { status: 400 }
        );
    }

    const id = nanoid();
    const cacheDir = path.join(process.cwd(), '.next/hosted-yaml');
    const filePath = path.join(cacheDir, `${id}.yml`);

    try {
        await mkdir(cacheDir, { recursive: true });
        // Write the sanitized content instead of raw input
        await writeFile(filePath, validation.sanitizedContent || yamlContent, 'utf8');
        return NextResponse.json({ url: `/api/yaml/${id}.yml`, id });
    } catch (err) {
        console.error('Failed to save YAML file:', err);
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
}
