import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

// Archivos cargados (una fila por archivo .txt subido)
export const archivos = pgTable("archivos", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 300 }).notNull(),
  deviceId: varchar("device_id", { length: 100 }),
  fechaInicio: varchar("fecha_inicio", { length: 30 }),
  fechaFin: varchar("fecha_fin", { length: 30 }),
  sampleRate: varchar("sample_rate", { length: 20 }),
  totalRegistros: integer("total_registros"),
  unidad: varchar("unidad", { length: 10 }),
  observaciones: text("observaciones"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

// Lecturas individuales de temperatura y humedad
export const lecturas = pgTable("lecturas", {
  id: serial("id").primaryKey(),
  archivoId: integer("archivo_id")
    .references(() => archivos.id)
    .notNull(),
  numero: integer("numero").notNull(),
  fechaHora: varchar("fecha_hora", { length: 30 }).notNull(),
  temperatura: numeric("temperatura", { precision: 6, scale: 2 }).notNull(),
  humedad: numeric("humedad", { precision: 6, scale: 2 }).notNull(),
});

export type Archivo = typeof archivos.$inferSelect;
export type NuevoArchivo = typeof archivos.$inferInsert;
export type Lectura = typeof lecturas.$inferSelect;
export type NuevaLectura = typeof lecturas.$inferInsert;
