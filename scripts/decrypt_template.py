"""
Descifra la plantilla FGL 059 y la guarda como .xlsx sin contraseña
para que ExcelJS pueda usarla como base en el export.
"""
import io
import msoffcrypto
import shutil

TEMPLATE = r"C:\Users\Usuario\Documents\ProyectoGrados\FGL 059 Monitoreo de Condiciones Ambientales del Laboratorio_V10 (7).xlsm"
PASSWORD = "Q1"
OUTPUT = r"C:\Users\Usuario\Documents\Proyectos\Universidad\TermiGrome\public\template_FGL059.xlsm"

import os
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

with open(TEMPLATE, "rb") as f:
    office_file = msoffcrypto.OfficeFile(f)
    office_file.load_key(password=PASSWORD)
    with open(OUTPUT, "wb") as out:
        office_file.decrypt(out)

print(f"Plantilla descifrada guardada en: {OUTPUT}")
