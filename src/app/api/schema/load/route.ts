import { loadGvks, loadSpecificSchemas } from '@/lib/schema/loadSchemas';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const version = req.nextUrl.searchParams.get('version')!;
  const schemasParam = req.nextUrl.searchParams.get('schemas');
  const fullSchema = req.nextUrl.searchParams.get('full') == "true";

  let schemas;
  if (schemasParam) {
    // Use loadSpecificSchemas if `schemas` are provided
    schemas = await loadSpecificSchemas(version, schemasParam.toLowerCase().split(","), fullSchema);
    const schemasRes = NextResponse.json(schemas);
    schemasRes.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return schemasRes;
  } else {
    const schemas3 = await loadGvks(version);
    const gvksRes = NextResponse.json({ gvks: schemas3 });
    gvksRes.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return gvksRes;
  }



}
