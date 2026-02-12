// src/db.js
// File ini ngurus koneksi ke database Postgres (Neon) pakai pg + Drizzle ORM

import 'dotenv/config'          // load variabel environment dari .env
import { Pool } from 'pg'       // pool koneksi dari node-postgres (pg)
import { drizzle } from 'drizzle-orm/node-postgres'  // adapter Drizzle untuk pg

// Cek dulu apakah DATABASE_URL sudah diset
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum diset di file .env')
}

// Buat pool koneksi ke Postgres
// Pool ini yang bakal dipakai Drizzle di bawah
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Bungkus pool dengan Drizzle, jadi kita bisa pakai API Drizzle yang enak
export const db = drizzle(pool)

// Catatan:
// - pool dipakai untuk manage banyak koneksi ke database
// - jangan lupa di-close (pool.end()) kalau script-nya selesai (lihat di crud-demo.js)

