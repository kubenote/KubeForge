import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs/promises';

const projectRoot = process.cwd(); // Safe root of the Next.js project
const CACHE_DIR = path.join(projectRoot, '.next', 'schema-cache');


export async function GET(req: NextRequest) {
  const version = req.nextUrl.searchParams.get('version');
  if (!version) return NextResponse.json({ error: 'Missing version' }, { status: 400 });

  try {
    const repo = 'kubenote/kubernetes-schema';
    const zipUrl = `https://github.com/${repo}/archive/refs/heads/${version}.zip`;

    const res = await fetch(zipUrl);
    if (!res.ok) throw new Error(`Failed to fetch ZIP from GitHub for ${version}`);

    const arrayBuffer = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const targetPath = path.join(CACHE_DIR, version);
    await mkdir(targetPath, { recursive: true });

    const writePromises: Promise<any>[] = [];

    zip.forEach((relativePath, file) => {
      if (!file.dir && relativePath.endsWith('.json')) {
        writePromises.push(
          file.async('nodebuffer').then((content) => {
            const cleanPath = relativePath.split('/').slice(1).join('/'); // strip top folder
            const fullPath = path.join(targetPath, cleanPath);
            return mkdir(path.dirname(fullPath), { recursive: true }).then(() =>
              writeFile(fullPath, content)
            );
          })
        );
      }
    });

    await Promise.all(writePromises);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Download or extraction failed' }, { status: 500 });
  }
}
