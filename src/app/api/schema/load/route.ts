import { loadSchemas } from '@/lib/schema/loadSchemas';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(req: NextRequest) {
  const version = req.nextUrl.searchParams.get('version')!;
  const schemas = await loadSchemas(version);
  const schemas2 = await loadSchemas(version, false);
  return NextResponse.json({ ref: schemas, preRef: schemas2});
}
