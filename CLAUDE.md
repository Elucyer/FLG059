# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run db:migrate   # Run DB migrations against AWS RDS (requires DATABASE_URL in .env.local)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

No test suite exists in this project.

## Architecture

**TermiGrome** is a single-password-protected Next.js app (App Router) that lets lab staff upload `.txt` files from a thermohygrometer, stores readings in PostgreSQL (AWS RDS), and exports them to a week-structured Excel report in FGL 059 format.

### Data Flow

1. **Upload** → `POST /api/upload` → `lib/parseTxt.ts` parses the `.txt` format → batch-inserts into `archivos` (file metadata) + `lecturas` (individual readings) tables via Drizzle ORM
2. **Export** → `GET /api/export?archivoId=<id>` → fetches rows from DB → passes JSON via stdin to `scripts/export_excel.py` (a Python subprocess) → Python uses `xlwings` COM automation to populate `public/template_FGL059.xlsm` → returns the generated file

### Key Implementation Notes

- **Column swap in parser:** The thermohygrometer `.txt` format has temperature and humidity columns labeled in reverse order; `lib/parseTxt.ts` swaps them during parsing.
- **Excel via Python subprocess:** Node.js cannot preserve Excel macros/charts/formulas. The export spawns a Python child process (`xlwings` + COM automation on Windows) to write into the macro-enabled `.xlsm` template.
- **Week sequencing:** The Python script groups readings by ISO week, assigns sequential week numbers (1, 2, 3…) based on data chronology (not calendar year), and writes each day's data to a fixed row offset (`12 + (day-1)*289`) in the sheet.
- **Auth:** Single HTTP-only cookie (`termigrome_session`). Password from `ADMIN_PASSWORD` env var, defaults to `"admin123"`. The `(protected)` route group in `app/admin/` enforces the auth guard in its `layout.tsx`.
- **Batch inserts:** Readings are inserted in batches of 500 rows to avoid query size limits.
- **SSL:** DB connection disables `rejectUnauthorized` and strips `sslmode` from the connection string for AWS RDS compatibility.

### DB Schema (Drizzle, `lib/schema.ts`)

- `archivos` — one row per uploaded file (device ID, date range, sample rate, unit, notes)
- `lecturas` — one row per reading, FK to `archivos.id`, indexed on `archivoId`

### Environment

Requires `.env.local` with:
```
DATABASE_URL=postgres://...
ADMIN_PASSWORD=...   # optional, defaults to admin123
```
