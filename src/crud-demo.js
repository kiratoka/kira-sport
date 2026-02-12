// src/crud-demo.js
// Contoh script CRUD lengkap (Create, Read, Update, Delete)
// pakai Drizzle ORM + Postgres (pg) + Neon
// Script ini jalan sekali lalu selesai (bukan server Express)

import { eq } from 'drizzle-orm'   // operator untuk where (==)
import { db, pool } from './db.js' // koneksi database dari src/db.js
import { demoUsers } from './schema.js' // schema tabel demo_users

async function main() {
  try {
    console.log('Mulai operasi CRUD...\n')

    // === CREATE: Insert user baru ===
    // values(): data yang mau dimasukin ke tabel
    const inserted = await db
      .insert(demoUsers)
      .values({
        name: 'Admin User',
        email: 'admin@example.com',
      })
      .returning() // supaya database balikin row yang baru dibuat

    // Karena returning() bisa balikin array, kita ambil index pertama
    const newUser = inserted[0]

    if (!newUser) {
      // Kalau entah kenapa gagal, kita lempar error
      throw new Error('Gagal membuat user baru')
    }

    console.log('✅ CREATE: User baru dibuat:')
    console.log(newUser)

    // === READ: Ambil user berdasarkan id ===
    const foundUsers = await db
      .select()
      .from(demoUsers)
      .where(eq(demoUsers.id, newUser.id)) // where id = newUser.id

    const foundUser = foundUsers[0]

    console.log('\n✅ READ: User yang ditemukan:')
    console.log(foundUser)

    // === UPDATE: Ubah nama user ===
    const updated = await db
      .update(demoUsers)
      .set({ name: 'Super Admin' }) // nilai baru
      .where(eq(demoUsers.id, newUser.id))
      .returning()

    const updatedUser = updated[0]

    if (!updatedUser) {
      throw new Error('Gagal meng-update user')
    }

    console.log('\n✅ UPDATE: User setelah di-update:')
    console.log(updatedUser)

    // === DELETE: Hapus user ===
    await db
      .delete(demoUsers)
      .where(eq(demoUsers.id, newUser.id))

    console.log('\n✅ DELETE: User sudah dihapus')

    console.log('\nCRUD selesai tanpa error. 🎉')
  } catch (error) {
    // Kalau ada error, kita log biar kelihatan jelas
    console.error('\n❌ Terjadi error saat operasi CRUD:')
    console.error(error)
    process.exitCode = 1
  } finally {
    // Bagian finally ini tetap jalan walaupun terjadi error
    // Penting: tutup pool supaya koneksi ke database benar-benar ditutup
    if (pool) {
      await pool.end()
      console.log('\nKoneksi database (pool) sudah ditutup.')
    }
  }
}

// Jalankan fungsi main()
main()

