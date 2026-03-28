import { db } from "@/lib/db";
import { archivos } from "@/lib/schema";
import { desc } from "drizzle-orm";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const listaArchivos = await db
    .select()
    .from(archivos)
    .orderBy(desc(archivos.creadoEn));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Archivos de Monitoreo</h1>
        <p className="text-slate-500 text-sm mt-1">
          Sube archivos .txt del termohigrómetro y exporta los datos al formato FGL 059.
        </p>
      </div>
      <DashboardClient initialArchivos={listaArchivos} />
    </div>
  );
}
