import { loadSchemas, loadGvks, loadSpecificSchemas } from '@/lib/schema/loadSchemas';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const version = req.nextUrl.searchParams.get('version')!;
  const schemasParam = req.nextUrl.searchParams.get('schemas');
  const fullSchema = req.nextUrl.searchParams.get('full') == "true";

  let schemas;
  if (schemasParam) {
    // Use loadSpecificSchemas if `schemas` are provided
    schemas = await loadSpecificSchemas(version, schemasParam.toLowerCase().split(","), fullSchema);
    return NextResponse.json(JSON.stringify(schemas));
  } else {
    //const schemas2 = await loadSchemas(version, false);
    const schemas3 = await loadGvks(version);
    //schemas = await loadSchemas(version);
    return NextResponse.json({ gvks: schemas3 });

  }



}
