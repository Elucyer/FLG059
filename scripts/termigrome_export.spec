# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['termigrome_export.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['numpy', 'pandas', 'matplotlib', 'scipy', 'PIL', 'Pillow', 'tkinter', 'PyQt5', 'PyQt6', 'wx', 'IPython', 'jupyter', 'notebook', 'sklearn', 'tensorflow', 'torch', 'cv2', 'sqlalchemy', 'cryptography', 'psutil', 'requests', 'urllib3', 'http', 'email', 'xml', 'html', 'unittest', 'doctest', 'pydoc'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='termigrome_export',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
