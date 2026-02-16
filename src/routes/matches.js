// ========== IMPOR ==========
// Router dari Express buat ngedefine endpoint (GET, POST, dll) dalam satu grup
import { Router } from 'express';
// Schema validasi: bikin payload/query gak sembarangan, harus sesuai aturan
import {createMatchSchema, listMatchesQuerySchema} from "../validation/matches.js";
// Tabel "matches" di DB + koneksi db (Drizzle ORM)
import {matches} from "../db/schema.js";
import {db} from "../db/db.js";
// Helper: nentuin status match (scheduled / live / finished) dari waktu mulai & selesai
import {getMatchStatus} from "../utils/match-status.js";
// desc = urutan descending (yang terbaru dulu)
import {desc} from "drizzle-orm";

// Router khusus buat semua route yang berhubungan sama "matches"
export const matchRouter = Router();

// Batas maksimal jumlah match yang bisa diminta sekaligus (biar gak overload)
const MAX_LIMIT = 100;

// ---------- GET /matches ----------
// Fungsi: ambil daftar pertandingan (list matches), bisa dikasih query ?limit=...
matchRouter.get('/', async (req, res) => {
    // Nah bro, sebelum kita proses request dari user (misal minta /matches?limit=20), kita harus cek dulu nih query yang dia masukin bener nggak formatnya.
    // Ini penting banget biar API kita nggak ketelan input aneh-aneh kayak limit=-100, limit=abc, atau bahkan query yang nggak jelas.
    // Kita pake listMatchesQuerySchema.safeParse buat ngevalidasi query stringnya.
    // Kenapa pake .safeParse? Soalnya dia nggak bakal ngelempar error yang bikin server nge-crash, tapi cuma kasih hasil success (true/false) plus detail errornya.
    // Dengan begini, kita bisa tangkep salah input dari user dengan cara yang lebih chill, terus kasih tau usernya "eh bro, query lu salah nih" tanpa server panik.
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    // Kalo validasi gagal (misal limit=-5 atau limit=abc), balikin 400 + detail errornya
    if (!parsed.success) {
        return res.status(400).json({error: 'Invalid query.', details: parsed.error.issues });
    }

    // Limit dipake user, atau default 50. Math.min bikin gak bisa lebih dari MAX_LIMIT (100)
    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        // Query ke DB: ambil semua kolom dari tabel matches
        // Urutin dari yang terbaru (createdAt descending), ambil sebanyak limit
        const data = await db
            .select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit);

        // Kirim response JSON { data: [...] }
        res.json({ data });
    } catch (e) {
        // Kalo DB error (koneksi putus, dll), balikin 500
        res.status(500).json({ error: 'Failed to list matches.' });
    }
});

// ---------- POST /matches ----------
// Fungsi: bikin pertandingan baru. Body harus JSON (sport, homeTeam, awayTeam, startTime, endTime, dll)
matchRouter.post('/', async (req, res) => {
    // Kalau body tidak dikirim (atau Content-Type bukan JSON), req.body bisa undefined.
    // Zod .object() butuh object; undefined → error "expected object received undefined".
    // Makanya pakai req.body ?? {} biar selalu ada object
    const parsed = createMatchSchema.safeParse(req.body ?? {});

    // Validasi gagal (field kurang, format salah, endTime < startTime, dll) → 400
    if(!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload.', details: parsed.error.issues });
    }

    // Ambil nilai yang perlu diolah khusus (tanggal & skor) dari hasil validasi
    const { data: { startTime, endTime, homeScore, awayScore } } = parsed;

    // Hitung status awal pake helper getMatchStatus
    // Catatan: getMatchStatus bisa aja balikin null (misal ada case yang belum di-handle)
    // Biar aman dan nggak pernah nulis NULL ke DB, kita kasih fallback default "scheduled"
    const rawStatus = getMatchStatus(startTime, endTime);
    const safeStatus = rawStatus ?? 'scheduled'; // fallback kalau null/undefined

    try {
        // Bro, jadi gini… pas ada kode `const [event] = await db.insert(matches).values({...}).returning();`
        // Maksudnya apa? Biar gampang, ini penjelasan nguliknya pake bahasa tongkrongan:

        // Kenapa kita tulisnya `const [event] = ...` dan bukannya langsung `const event = ...`?
        // Jadi, gini bro: method `.returning()` dari Drizzle ORM itu selalu balikin hasil dalam bentuk array,
        // karena secara teorinya lo bisa aja insert lebih dari satu row sekaligus dan dapet lebih dari satu hasil.
        // Walaupun di kasus ini kita cuma insert SATU pertandingan, hasilnya tetep dibungkus array, kayak gini contohnya:
        //    await db.insert(matches).values({...}).returning(); // Hasilnya: [ { match info ... } ]
        // Nah, kalau lo tulis:
        //    const result = [ { a: 1 } ];
        //    const event = result;
        // Maka `event` bakal berisi array, bukan object match-nya langsung!
        // Cara yang lebih enak: pakai destructuring `[event]`, contohnya:
        //    const [foo] = [10, 20, 30]; // sekarang foo = 10 (langsung ambil dari index 0)
        // Jadi dengan:
        //    const [event] = await db.insert(...).returning();
        // Kita langsung ambil object match barunya dari index ke-0 array hasil insert tadi, biar gampang dipakai.
        // Sederhananya, ini bikin variabel `event` langsung jadi object match, ngga perlu ngakses via array lagi.
        // Kalau skip destructuring, nanti harus akses kayak `result[0]`, lebih ribet.

        // Lanjut, `.returning()` itu method dari Drizzle (bukan JavaScript native), fungsinya buat request ke DB:
        // "Eh DB, abis lo masukin data match baru, balikin dong datanya lengkap, biar langsung bisa dipakai/script!"
        // Jadi tanpa perlu query ulang, kita dapet semua kolom dari row yang baru saja di-insert. Praktis kan?

        const [event] = await db.insert(matches).values({
            ...parsed.data,                                    // Isi data pertandingan: sport, nama tim, dst
            startTime: new Date(startTime),                    // Mulai jadikan Date object
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,                         // Nilai default skor = 0 kalau ga dikirim
            awayScore: awayScore ?? 0,
            // Pakai status yang sudah dipastikan nggak null
            // Jadi di DB nggak akan pernah ada status NULL
            status: safeStatus,
        }).returning(); // <– ini Drizzle ORM, bro, bukan JS biasa

        // Nah setelah dapet object match barunya (`event`), kita cek:
        // Ada gak sih function broadcast yang udah didefine di app? (Biasa dipake buat real-time, misal WebSocket, atau emit ke client)
        // Kalau ada, langsung panggil fungsi itu, sambil ngasih tau tentang match baru yang barusan dibuat.
        // Tujuannya biar semua client yang terkoneksi tau secara real time ("Eh bro, ada match baru nih!").
        if(res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event);
        }

        // Terakhir, balikkin status sukses 201 (Created), plus data match barunya ke client yang request
        res.status(201).json({ data: event });
    } catch (e) {
        // Kalo insert gagal (DB error, constraint, dll):
        // - Error lengkapnya kita log di server (buat debugging developer)
        // - Client cuma dikasih pesan generic, tanpa detail internal (lebih aman, gak bocorin info sensitif)
        console.error(e);
        res.status(500).json({ error: 'Failed to create match.' });
    }
});

