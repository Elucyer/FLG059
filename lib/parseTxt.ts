export interface TxtHeader {
  deviceId: string;
  fechaArchivo: string;
  sampleRate: string;
  totalRegistros: number;
  unidad: string;
}

export interface TxtRow {
  numero: number;
  fechaHora: string;
  temperatura: number; // col3 del archivo (en el archivo viene como humedad, corregido)
  humedad: number;     // col4 del archivo (en el archivo viene como temperatura, corregido)
}

export interface ParsedTxt {
  header: TxtHeader;
  rows: TxtRow[];
}

export function parseTxtContent(content: string): ParsedTxt {
  const lines = content.split("\n").map((l) => l.trimEnd());

  const header: TxtHeader = {
    deviceId: "",
    fechaArchivo: "",
    sampleRate: "",
    totalRegistros: 0,
    unidad: "",
  };

  const rows: TxtRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Líneas de cabecera
    if (trimmed.startsWith("#")) {
      header.deviceId = trimmed.replace(/^#/, "").trim();
      continue;
    }
    if (trimmed.startsWith("Date:")) {
      header.fechaArchivo = trimmed.replace(/^Date:\s*/, "").trim();
      continue;
    }
    if (trimmed.startsWith("ID=")) {
      header.deviceId = trimmed.replace(/^ID=\s*/, "").trim();
      continue;
    }
    if (trimmed.startsWith("Sample_Rate=")) {
      header.sampleRate = trimmed.replace(/^Sample_Rate=\s*/, "").trim();
      continue;
    }
    if (trimmed.startsWith("Total_Records=")) {
      header.totalRegistros = parseInt(
        trimmed.replace(/^Total_Records=\s*/, "").trim(),
        10
      );
      continue;
    }
    if (trimmed.startsWith("Unit:")) {
      header.unidad = trimmed.replace(/^Unit:\s*/, "").trim();
      continue;
    }

    // Líneas de datos: "  1  2022-09-08 12:15:44   19.3   51.1"
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 5 && /^\d+$/.test(parts[0])) {
      const numero = parseInt(parts[0], 10);
      const fecha = parts[1]; // YYYY-MM-DD
      const hora = parts[2];  // HH:MM:SS
      const col3 = parseFloat(parts[3]); // En el archivo: aparece como humedad → es temperatura
      const col4 = parseFloat(parts[4]); // En el archivo: aparece como temperatura → es humedad

      // Corrección: col3 → temperatura, col4 → humedad
      rows.push({
        numero,
        fechaHora: `${fecha} ${hora}`,
        temperatura: col3,
        humedad: col4,
      });
    }
  }

  return { header, rows };
}
