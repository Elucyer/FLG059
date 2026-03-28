import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { archivos, lecturas } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth";
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "template_FGL059.xlsm");
const SCRIPT_PATH = path.join(process.cwd(), "scripts", "export_excel.py");

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const archivoId = parseInt(searchParams.get("archivoId") ?? "", 10);
  if (isNaN(archivoId)) {
    return NextResponse.json({ error: "archivoId inválido" }, { status: 400 });
  }

  try {
    const [archivo] = await db
      .select()
      .from(archivos)
      .where(eq(archivos.id, archivoId));

    if (!archivo) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const filas = await db
      .select()
      .from(lecturas)
      .where(eq(lecturas.archivoId, archivoId))
      .orderBy(asc(lecturas.numero));

    // ── Archivo temporal de salida ────────────────────────────────────────────
    const outputPath = path.join(os.tmpdir(), `fgl059_export_${archivoId}_${Date.now()}.xlsx`);

    const payload = JSON.stringify({
      template_path: TEMPLATE_PATH,
      output_path: outputPath,
      rows: filas.map((f) => ({
        fechaHora: f.fechaHora,
        humedad: f.humedad,
        temperatura: f.temperatura,
      })),
    });

    // ── Llamar al script Python ───────────────────────────────────────────────
    const result = spawnSync("python", [SCRIPT_PATH], {
      input: payload,
      encoding: "utf8",
      timeout: 120_000,
    });

    if (result.status !== 0) {
      const errMsg = result.stderr || result.error?.message || "Error desconocido";
      console.error("[export] Python error:", errMsg);
      return NextResponse.json(
        { error: `Error al generar Excel: ${errMsg}` },
        { status: 500 }
      );
    }

    // ── Leer el archivo generado y devolverlo ─────────────────────────────────
    if (!fs.existsSync(outputPath)) {
      console.error("[export] Archivo de salida no encontrado:", outputPath);
      return NextResponse.json({ error: "El script no generó el archivo" }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath); // limpiar temp

    console.log("[export] Archivo generado OK. Tamaño:", fileBuffer.length, "bytes. Magic:", fileBuffer.subarray(0,4).toString("hex"));

    const filename = `FGL059_${archivo.deviceId ?? "monitoreo"}_${
      archivo.fechaInicio?.slice(0, 7) ?? "datos"
    }.xlsx`;

    // Retorna el ArrayBuffer subyacente para evitar problemas de conversión
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    ) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (err) {
    console.error("[export] Error:", err);
    return NextResponse.json(
      { error: "Error interno al generar el archivo Excel" },
      { status: 500 }
    );
  }
}
