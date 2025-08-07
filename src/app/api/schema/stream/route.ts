import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs/promises';

const CACHE_DIR = path.join(process.cwd(), 'schema-cache');
let controller: ReadableStreamDefaultController;

export async function GET(req: NextRequest) {
    const version = req.nextUrl.searchParams.get('version');
    if (!version) {
        return new Response('Missing version', { status: 400 });
    }

    const zipUrl = `https://github.com/kubenote/kubernetes-schema/archive/refs/heads/${version}.zip`;

    const stream = new ReadableStream({
        start(ctrl) {
            controller = ctrl;
        },
    });

    const encoder = new TextEncoder();

    const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    (async () => {
        try {

            const targetPath = path.join(CACHE_DIR, version, "raw");

            try {
                const stat = await fs.stat(targetPath);
                if (stat.isDirectory()) {
                    send({ done: true, cached: true });
                    controller.close();
                    return;
                }
            } catch {


                const res = await fetch(zipUrl);
                const buf = await res.arrayBuffer();
                send({ progress: 10, status: 'zip_downloaded' });

                const zip = await JSZip.loadAsync(buf);
                const entries = Object.entries(zip.files);
                const total = entries.length;
                let done = 0;

                await fs.mkdir(targetPath, { recursive: true });

                for (const [relativePath, file] of entries) {
                    if (!file.dir) {
                        const content = await file.async('nodebuffer');

                        // Remove the top-level folder (e.g., 'kubernetes-schema-1.29.1')
                        const parts = relativePath.split('/');
                        const relativeWithinSchema = parts.slice(1).join('/');

                        const fullPath = path.join(targetPath, relativeWithinSchema);

                        await fs.mkdir(path.dirname(fullPath), { recursive: true });
                        await fs.writeFile(fullPath, content);
                    }

                    done++;
                    const percent = Math.floor((done / total) * 90 + 10); // 10–100%
                    send({ progress: percent });
                }


                send({ done: true });
                controller.close();
                // Folder doesn't exist – continue to download
            }
        } catch (err) {
            send({ error: true, message: 'Failed to extract' });
            controller.close();
        }
    })();

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
