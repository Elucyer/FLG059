"use client";

import { useState, useRef } from "react";
import type { Archivo } from "@/lib/schema";

interface Props {
  initialArchivos: Archivo[];
}

export default function DashboardClient({ initialArchivos }: Props) {
  const [archivos, setArchivos] = useState<Archivo[]>(initialArchivos);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadMsg(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("observaciones", observaciones);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (res.ok) {
      setUploadMsg({ type: "ok", text: `Archivo cargado: ${data.nombre} (${data.totalRegistros} lecturas)` });
      setSelectedFile(null);
      setObservaciones("");
      if (fileRef.current) fileRef.current.value = "";

      // Refrescar lista
      const listRes = await fetch("/api/archivos");
      if (listRes.ok) setArchivos(await listRes.json());
    } else {
      setUploadMsg({ type: "err", text: data.error ?? "Error al cargar el archivo." });
    }
    setUploading(false);
  };

  const handleExport = async (archivo: Archivo) => {
    setExportingId(archivo.id);
    const res = await fetch(`/api/export?archivoId=${archivo.id}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FGL059_${archivo.deviceId ?? "monitoreo"}_${archivo.fechaInicio ?? "datos"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert("Error al exportar.");
    }
    setExportingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este archivo y todas sus lecturas?")) return;
    const res = await fetch(`/api/archivos?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setArchivos((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert("Error al eliminar.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Cargar archivo .txt</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Archivo .txt del termohigrómetro
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".txt"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Observaciones (opcional)
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Revisión mensual sala de cultivos"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {uploadMsg && (
            <p className={`text-sm ${uploadMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {uploadMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {uploading ? "Procesando..." : "Cargar archivo"}
          </button>
        </form>
      </div>

      {/* Archivos List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700">
            Archivos cargados ({archivos.length})
          </h2>
        </div>

        {archivos.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            No hay archivos cargados. Sube un archivo .txt para comenzar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Dispositivo</th>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-left">Lecturas</th>
                  <th className="px-4 py-3 text-left">Intervalo</th>
                  <th className="px-4 py-3 text-left">Observaciones</th>
                  <th className="px-4 py-3 text-left">Cargado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivos.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.deviceId ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.fechaInicio && a.fechaFin
                        ? `${a.fechaInicio.slice(0, 10)} → ${a.fechaFin.slice(0, 10)}`
                        : a.fechaInicio ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.totalRegistros ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{a.sampleRate ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {a.observaciones ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(a.creadoEn).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleExport(a)}
                        disabled={exportingId === a.id}
                        className="inline-flex items-center gap-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {exportingId === a.id ? "Exportando..." : "Exportar Excel"}
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="inline-flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
