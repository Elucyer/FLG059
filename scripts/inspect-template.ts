/**
 * Script para inspeccionar la plantilla Excel FGL 059
 * Uso: npx tsx scripts/inspect-template.ts
 */
import ExcelJS from "exceljs";
import path from "path";

const TEMPLATE = path.resolve(
  "C:/Users/Usuario/Documents/ProyectoGrados/FGL 059 Monitoreo de Condiciones Ambientales del Laboratorio_V10 (7).xlsm"
);

async function main() {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(TEMPLATE);
  } catch (e) {
    console.error("Error leyendo archivo:", e);
    return;
  }

  console.log(`\nHojas en la plantilla (${wb.worksheets.length}):`);
  wb.worksheets.forEach((ws, i) => {
    console.log(`\n[${i + 1}] "${ws.name}" — ${ws.rowCount} filas, ${ws.columnCount} columnas`);

    // Primeras 40 filas de cada hoja
    let rowsPrinted = 0;
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowsPrinted >= 40) return;
      const vals: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const v = cell.formula
          ? `[F:${cell.formula}]`
          : cell.value !== null && cell.value !== undefined
          ? String(cell.value)
          : "";
        if (v) vals.push(`C${colNum}="${v}"`);
      });
      if (vals.length) {
        console.log(`  R${rowNum}: ${vals.join(" | ")}`);
        rowsPrinted++;
      }
    });

    if (ws.rowCount > 40) {
      console.log(`  ... (${ws.rowCount - 40} filas más)`);
    }
  });
}

main();
