import { loadSchemas, loadGvks } from '@/lib/schema/loadSchemas';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(req: NextRequest) {
  const version = req.nextUrl.searchParams.get('version')!;
  const schemas = await loadSchemas(version);
  const schemas2 = await loadSchemas(version, false);
    const schemas3 = await loadGvks(version);

  return NextResponse.json({ ref: schemas, preRef: schemas2, gvks: schemas3});
}
