import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { archivos, lecturas } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const lista = await db
    .select()
    .from(archivos)
    .orderBy(desc(archivos.creadoEn));

  return NextResponse.json(lista);
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "", 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await db.delete(lecturas).where(eq(lecturas.archivoId, id));
  await db.delete(archivos).where(eq(archivos.id, id));

  return NextResponse.json({ ok: true });
}
