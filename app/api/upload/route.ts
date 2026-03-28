import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { archivos, lecturas } from "@/lib/schema";
import { parseTxtContent } from "@/lib/parseTxt";
import { isAuthenticated } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const observaciones = (formData.get("observaciones") as string) ?? "";

  if (!file || !file.name.endsWith(".txt")) {
    return NextResponse.json({ error: "Se requiere un archivo .txt" }, { status: 400 });
  }

  const content = await file.text();
  const { header, rows } = parseTxtContent(content);

  if (rows.length === 0) {
    return NextResponse.json({ error: "El archivo no contiene datos de lecturas." }, { status: 400 });
  }

  const fechaInicio = rows[0].fechaHora;
  const fechaFin = rows[rows.length - 1].fechaHora;

  // Insertar archivo
  const [archivo] = await db
    .insert(archivos)
    .values({
      nombre: file.name,
      deviceId: header.deviceId || null,
      fechaInicio,
      fechaFin,
      sampleRate: header.sampleRate || null,
      totalRegistros: rows.length,
      unidad: header.unidad || "C",
      observaciones: observaciones || null,
    })
    .returning();

  // Insertar lecturas en lotes de 500
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({
      archivoId: archivo.id,
      numero: r.numero,
      fechaHora: r.fechaHora,
      temperatura: String(r.temperatura),
      humedad: String(r.humedad),
    }));
    await db.insert(lecturas).values(batch);
  }

  return NextResponse.json({
    id: archivo.id,
    nombre: archivo.nombre,
    totalRegistros: rows.length,
  });
}
