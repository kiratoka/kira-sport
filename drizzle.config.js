// drizzle.config.mjs
// Config untuk Drizzle Kit (migrasi database)
// File ini dipakai saat jalanin:
// - npm run db:generate
// - npm run db:migrate

import 'dotenv/config'  // otomatis load isi .env
import { defineConfig } from 'drizzle-kit'

// Cek dulu, jangan sampai lupa set DATABASE_URL di .env
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum diset di file .env')
}

/** @type {import('drizzle-kit').Config} */
export default defineConfig({
  // lokasi schema Drizzle kita (JavaScript)
  schema: './src/db/schema.js',
  // folder output file migrasi
  out: './drizzle',
  // kita pakai Postgres (Neon itu Postgres compatible)
  dialect: 'postgresql',
  dbCredentials: {
    // pakai URL dari .env
    url: process.env.DATABASE_URL,
  },
})

