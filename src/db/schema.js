// src/db/schema.js
// ============================================
// File ini berisi definisi schema tabel database
// pakai Drizzle ORM + Postgres untuk aplikasi
// real-time olahraga (sports).
// ============================================

import {
  pgEnum,
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'

// -------------------------------------------------
// ENUM: match_status
// -------------------------------------------------
// - Disimpan di database sebagai ENUM Postgres
// - Variabel JS pakai camelCase (matchStatusEnum)
// - Nilai di DB: 'scheduled' | 'live' | 'finished'
export const matchStatusEnum = pgEnum('match_status', [
  'scheduled',
  'live',
  'finished',
])

// -------------------------------------------------
// TABLE: matches
// -------------------------------------------------
// Catatan penting:
// - Nama tabel di DB: "matches"  (snake_case / plural wajar)
// - Nama kolom di DB: snake_case (sesuai requirement)
// - Nama properti di kode JS: camelCase (sesuai requirement)
export const matches = pgTable('matches', {
  // id: primary key auto increment
  id: serial('id').primaryKey(),

  // sport: jenis olahraga (soccer, basketball, dll)
  sport: varchar('sport', { length: 50 }).notNull(),

  // home_team & away_team: nama tim
  homeTeam: varchar('home_team', { length: 100 }).notNull(),
  awayTeam: varchar('away_team', { length: 100 }).notNull(),

  // status: pakai ENUM match_status
  // default: 'scheduled'
  status: matchStatusEnum('status').notNull().default('scheduled'),

  // start_time & end_time: waktu mulai & selesai pertandingan
  // withTimezone: true supaya aman kalau beda zona waktu
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),

  // Skor tim
  // default 0 sesuai requirement
  homeScore: integer('home_score').notNull().default(0),
  awayScore: integer('away_score').notNull().default(0),

  // created_at: kapan row ini dibuat
  // defaultNow() = pakai NOW() dari Postgres
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// -------------------------------------------------
// TABLE: commentary
// -------------------------------------------------
// Catatan:
// - Nama tabel: "commentary"
// - Tiap row = 1 event / komentar di pertandingan (live commentary)
export const commentary = pgTable('commentary', {
  // id: primary key auto increment
  id: serial('id').primaryKey(),

  // match_id: foreign key ke tabel matches.id
  // - pakai snake_case di DB
  // - variabel JS: matchId (camelCase)
  matchId: integer('match_id')
    .notNull()
    .references(() => matches.id, {
      onDelete: 'cascade', // kalau match dihapus, commentary ikut dihapus
    }),

  // minute: menit ke berapa (misal 45, 90, dst)
  minute: integer('minute'),

  // sequence: urutan event di pertandingan (1,2,3, dst)
  sequence: integer('sequence'),

  // period: babak berapa (1st half, 2nd half, OT, dst)
  // - bisa diisi angka (1,2,3) atau teks (H1,H2)
  period: varchar('period', { length: 50 }),

  // event_type: tipe event (goal, foul, substitution, yellow_card, dst)
  eventType: varchar('event_type', { length: 100 }).notNull(),

  // actor: nama pemain / official yang terlibat
  actor: varchar('actor', { length: 150 }),

  // team: nama tim yang terkait dengan event ini
  team: varchar('team', { length: 100 }),

  // message: teks lengkap komentar yang ditampilkan ke user
  message: text('message').notNull(),

  // metadata: jsonb untuk simpan data tambahan
  // contoh isi:
  // { x: 0.23, y: 0.75, playerId: 123, assistBy: "Nama Pemain" }
  metadata: jsonb('metadata'),

  // tags: array of text, misal:
  // ['goal', 'penalty', 'highlight']
  tags: text('tags').array(),

  // created_at: kapan komentar ini dibuat / dicatat
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Ringkasan:
// - matchStatusEnum: ENUM 'scheduled' | 'live' | 'finished'
// - matches: tabel utama pertandingan
// - commentary: tabel event/komentar per pertandingan
// - Semua nama kolom di DB pakai snake_case
// - Semua nama variabel di kode JS pakai camelCase

