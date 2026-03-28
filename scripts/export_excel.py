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
"""

import sys
import json
import xlwings as xw

DATA_START_ROW = 12
SHEET_NAME = "Datos - S1"


def main():
    data = json.loads(sys.stdin.read())
    template_path = data["template_path"]
    output_path   = data["output_path"]
    rows          = data["rows"]

    app = xw.App(visible=False, add_book=False)
    try:
        wb = app.books.open(template_path)
        ws = wb.sheets[SHEET_NAME]

        # Escribe toda la data de una sola llamada COM (array 2D)
        data = []
        for row in rows:
            parts = row["fechaHora"].split(" ")
            fecha = parts[0] if len(parts) > 0 else ""
            hora  = parts[1] if len(parts) > 1 else ""
            data.append([fecha, hora, float(row["humedad"]), float(row["temperatura"])])

        if data:
            ws.range(f"B{DATA_START_ROW}").value = data

        wb.save(output_path)
        wb.close()
        print(f"OK:{output_path}", flush=True)
    finally:
        app.quit()


if __name__ == "__main__":
    main()
