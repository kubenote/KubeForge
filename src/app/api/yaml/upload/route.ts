import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

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

    if (process.env.DEMO_MODE === "true") return NextResponse.json({ error: 'Demo Mode: No Uploads Allowed' });

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
