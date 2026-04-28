"""
export_excel.py
Recibe por stdin un JSON con:
  {
    "template_path": "C:\\...\\template_FGL059.xlsx",
    "output_path":   "C:\\...\\output.xlsx",
    "rows": [
      { "fechaHora": "2022-09-08 08:00:00", "humedad": 45.5, "temperatura": 22.3 },
      ...
    ]
  }
Usa xlwings (COM de Excel) para escribir los datos y guardar,
preservando charts, VBA, fórmulas y todo el contenido de la plantilla.

Estructura del template por hoja (Datos - S1 … S5):
  - Cada hoja cubre una semana calendario.
  - Dentro de cada hoja hay 7 bloques de día:
      DÍA n  →  header en fila (11 + (n-1)*289), datos desde fila (12 + (n-1)*289)
      donde n = día de la semana (1=lun … 7=dom).
  - Las semanas se numeran secuencialmente por orden cronológico del dataset,
    sin importar el límite de mes.
"""

import sys
import json
from datetime import datetime
import xlwings as xw

# Fila de inicio de datos para DÍA n: DATA_DAY_START + (n-1) * DAY_BLOCK
DATA_DAY_START = 12
DAY_BLOCK      = 289  # filas por bloque de día


def main():
    payload = json.loads(sys.stdin.read())
    template_path = payload["template_path"]
    output_path   = payload["output_path"]
    rows          = payload["rows"]

    # ── 1. Parsear y ordenar cronológicamente ────────────────────────────────
    parsed = []
    for row in rows:
        parts     = row["fechaHora"].split(" ")
        fecha_str = parts[0]  # YYYY-MM-DD
        hora_str  = parts[1] if len(parts) > 1 else ""
        d         = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        parsed.append((d, fecha_str, hora_str, float(row["humedad"]), float(row["temperatura"])))

    parsed.sort(key=lambda x: x[0])

    # ── 2. Asignar número de semana secuencial (1=primera semana del dataset) ─
    iso_week_to_seq: dict[tuple, int] = {}
    seq = 0
    for d, *_ in parsed:
        key = d.isocalendar()[:2]  # (iso_year, iso_week)
        if key not in iso_week_to_seq:
            seq += 1
            iso_week_to_seq[key] = seq

    # ── 3. Agrupar por (semana_seq, fecha_str) ───────────────────────────────
    # Celdas de fecha: objeto date para que Excel use el formato de la celda (no string)
    groups: dict[tuple[int, str], list] = {}
    for d, fecha_str, hora_str, humedad, temp in parsed:
        week_seq = iso_week_to_seq[d.isocalendar()[:2]]
        groups.setdefault((week_seq, fecha_str), []).append(
            [d, hora_str, humedad, temp]
        )

    # ── 4. Dentro de cada semana, numerar días por orden de aparición ─────────
    # DÍA 1 = primer día con registros, DÍA 2 = segundo, etc. (independiente del día de la semana)
    from collections import defaultdict
    week_day_index: dict[int, dict[str, int]] = defaultdict(dict)
    for (week_seq, fecha_str) in sorted(groups.keys()):
        day_map = week_day_index[week_seq]
        if fecha_str not in day_map:
            day_map[fecha_str] = len(day_map) + 1  # 1-based

    # ── 5. Escribir en el template ────────────────────────────────────────────
    app = xw.App(visible=False, add_book=False)
    try:
        wb = app.books.open(template_path)

        for (week_seq, fecha_str), cell_rows in groups.items():
            day_num    = week_day_index[week_seq][fecha_str]
            sheet_name = f"Datos - S{week_seq}"
            start_row  = DATA_DAY_START + (day_num - 1) * DAY_BLOCK
            ws = wb.sheets[sheet_name]
            ws.range(f"B{start_row}").value = cell_rows

        wb.app.calculate()
        wb.save(output_path)
        wb.close()
        print(f"OK:{output_path}", flush=True)
    finally:
        app.quit()


if __name__ == "__main__":
    main()
