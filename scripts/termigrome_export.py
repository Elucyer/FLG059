"""
termigrome_export.py
Standalone script: toma el .txt más reciente de la carpeta de entrada,
lo parsea y genera el Excel FGL059 en la carpeta de salida.

Requiere Excel instalado (xlwings usa COM automation).
No requiere Python instalado si se compila con PyInstaller.

config.ini debe estar en el mismo directorio que este script / .exe
"""

import sys
import os
import glob
import configparser
from datetime import datetime
from collections import defaultdict
import xlwings as xw

# ── Constantes de estructura del template ────────────────────────────────────
DATA_DAY_START = 12
DAY_BLOCK      = 289


def find_config():
    if getattr(sys, "frozen", False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, "config.ini")


def load_config():
    path = find_config()
    if not os.path.exists(path):
        print(f"ERROR: No se encontró config.ini en {path}")
        sys.exit(1)

    cfg = configparser.ConfigParser()
    cfg.read(path, encoding="utf-8")

    input_dir    = cfg.get("rutas", "entrada", fallback="").strip()
    output_dir   = cfg.get("rutas", "salida", fallback="").strip()
    template     = cfg.get("rutas", "template", fallback="").strip()
    password     = cfg.get("rutas", "password", fallback="").strip() or None

    for name, val in [("entrada", input_dir), ("salida", output_dir), ("template", template)]:
        if not val:
            print(f"ERROR: La clave '{name}' no está definida en config.ini")
            sys.exit(1)

    return input_dir, output_dir, template, password


def find_latest_txt(folder):
    txts = glob.glob(os.path.join(folder, "*.txt"))
    if not txts:
        print(f"ERROR: No se encontraron archivos .txt en {folder}")
        sys.exit(1)
    return max(txts, key=os.path.getmtime)


def parse_txt(filepath):
    with open(filepath, encoding="utf-8", errors="replace") as f:
        lines = f.read().splitlines()

    device_id = ""
    rows = []

    for line in lines:
        t = line.strip()
        if not t:
            continue
        if t.startswith("#"):
            device_id = t.lstrip("#").strip()
        elif t.startswith("ID="):
            device_id = t[3:].strip()
        elif t[0].isdigit():
            parts = t.split()
            if len(parts) >= 5:
                fecha    = parts[1]
                hora     = parts[2]
                col3     = float(parts[3])  # temperatura (columnas invertidas en el archivo)
                col4     = float(parts[4])  # humedad
                rows.append({
                    "fechaHora":    f"{fecha} {hora}",
                    "temperatura":  col3,
                    "humedad":      col4,
                    "fecha_str":    fecha,
                })

    return device_id, rows


def build_groups(rows):
    parsed = []
    for r in rows:
        d = datetime.strptime(r["fecha_str"], "%Y-%m-%d").date()
        parsed.append((d, r["fecha_str"], r["fechaHora"].split(" ")[1], r["humedad"], r["temperatura"]))

    parsed.sort(key=lambda x: x[0])

    iso_week_to_seq = {}
    seq = 0
    for d, *_ in parsed:
        key = d.isocalendar()[:2]
        if key not in iso_week_to_seq:
            seq += 1
            iso_week_to_seq[key] = seq

    groups = {}
    for d, fecha_str, hora_str, humedad, temp in parsed:
        week_seq = iso_week_to_seq[d.isocalendar()[:2]]
        groups.setdefault((week_seq, fecha_str), []).append([d, hora_str, humedad, temp])

    week_day_index = defaultdict(dict)
    for (week_seq, fecha_str) in sorted(groups.keys()):
        day_map = week_day_index[week_seq]
        if fecha_str not in day_map:
            day_map[fecha_str] = len(day_map) + 1

    return groups, week_day_index


def export(template_path, output_path, groups, week_day_index, password=None):
    app = xw.App(visible=False, add_book=False)
    try:
        wb = app.books.open(template_path, password=password)

        # Eliminar mensajes de validación que aparecen al seleccionar celdas
        for ws in wb.sheets:
            ws.api.Cells.Validation.Delete()

        for (week_seq, fecha_str), cell_rows in groups.items():
            day_num    = week_day_index[week_seq][fecha_str]
            sheet_name = f"Datos - S{week_seq}"
            start_row  = DATA_DAY_START + (day_num - 1) * DAY_BLOCK
            ws = wb.sheets[sheet_name]
            ws.range(f"B{start_row}").value = cell_rows

        wb.app.calculate()
        wb.save(output_path)
        wb.close()
    finally:
        app.quit()


def main():
    input_dir, output_dir, template_path, password = load_config()

    if not os.path.isdir(input_dir):
        print(f"ERROR: La carpeta de entrada no existe: {input_dir}")
        sys.exit(1)
    if not os.path.isdir(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    if not os.path.isfile(template_path):
        print(f"ERROR: No se encontró el template: {template_path}")
        sys.exit(1)

    txt_path = find_latest_txt(input_dir)
    print(f"Procesando: {txt_path}")

    device_id, rows = parse_txt(txt_path)
    if not rows:
        print("ERROR: El archivo no contiene lecturas válidas.")
        sys.exit(1)

    groups, week_day_index = build_groups(rows)

    # Nombre de salida con device_id y rango de fechas
    fechas     = sorted(set(f for _, f in groups.keys()))
    fecha_ini  = fechas[0][:7]   # YYYY-MM
    fecha_fin  = fechas[-1][:7]
    rango      = fecha_ini if fecha_ini == fecha_fin else f"{fecha_ini}_{fecha_fin}"
    safe_dev   = (device_id or "monitoreo").replace(" ", "_")
    filename   = f"FGL059_{safe_dev}_{rango}.xlsx"
    output_path = os.path.join(output_dir, filename)

    print(f"Generando Excel: {output_path}")
    export(template_path, output_path, groups, week_day_index, password)
    print(f"OK: {output_path}")


if __name__ == "__main__":
    main()
