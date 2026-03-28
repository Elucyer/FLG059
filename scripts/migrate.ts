/**
 * Script de migración — crea la base de datos FLG059 y sus tablas en AWS RDS.
 * Uso: npm run db:migrate
 */
import { Pool, Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE_URL = process.env.DATABASE_URL!.replace(/[?&]sslmode=[^&]*/g, "");
const SSL_OPTS = { rejectUnauthorized: false };

// Extrae la URL apuntando a 'appgastos' (base existente) para crear FLG059
const adminUrl = BASE_URL.replace(/\/FLG059$/, "/appgastos");

async function main() {
  // 1. Conectar a la base existente y crear FLG059 si no existe
  const adminClient = new Client({ connectionString: adminUrl, ssl: SSL_OPTS });
  await adminClient.connect();
  console.log("⏳ Conectado a 'appgastos'. Verificando base de datos FLG059...");

  const { rows } = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    ["FLG059"]
  );

  if (rows.length === 0) {
    // CREATE DATABASE no puede ir dentro de una transacción
    await adminClient.query('CREATE DATABASE "FLG059"');
    console.log('✅ Base de datos "FLG059" creada.');
  } else {
    console.log('ℹ️  Base de datos "FLG059" ya existe.');
  }
  await adminClient.end();

  // 2. Conectar a FLG059 y crear las tablas
  const pool = new Pool({ connectionString: BASE_URL, ssl: SSL_OPTS });
  const client = await pool.connect();
  console.log("⏳ Conectado a FLG059. Creando tablas...");

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS archivos (
        id              SERIAL PRIMARY KEY,
        nombre          VARCHAR(300) NOT NULL,
        device_id       VARCHAR(100),
        fecha_inicio    VARCHAR(30),
        fecha_fin       VARCHAR(30),
        sample_rate     VARCHAR(20),
        total_registros INTEGER,
        unidad          VARCHAR(10),
        observaciones   TEXT,
        creado_en       TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✅ Tabla 'archivos' lista.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS lecturas (
        id          SERIAL PRIMARY KEY,
        archivo_id  INTEGER REFERENCES archivos(id) NOT NULL,
        numero      INTEGER NOT NULL,
        fecha_hora  VARCHAR(30) NOT NULL,
        temperatura NUMERIC(6, 2) NOT NULL,
        humedad     NUMERIC(6, 2) NOT NULL
      )
    `);
    console.log("✅ Tabla 'lecturas' lista.");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lecturas_archivo ON lecturas(archivo_id);
    `);
    console.log("✅ Índice creado.");

    console.log("\n🎉 Migración completada exitosamente.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Error en migración:", err);
  process.exit(1);
});
