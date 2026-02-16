// Ambil konstanta status pertandingan (scheduled, live, finished) dari validasi
import { MATCH_STATUS } from '../validation/matches.js';

/**
 * Nentuin status pertandingan berdasarkan waktu mulai & selesai.
 * Kalo gak dikasih now, pakai waktu sekarang (buat testing bisa dikasih manual).
 */
export function getMatchStatus(startTime, endTime, now = new Date()) {
    // Ubah ke objek Date biar bisa dibandingin
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Cek valid: kalo start/end invalid (misal string aneh), return null biar gak error
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    // Belum mulai → scheduled
    if (now < start) {
        return MATCH_STATUS.SCHEDULED;
    }

    // Sudah lewat waktu selesai → finished
    if (now >= end) {
        return MATCH_STATUS.FINISHED;
    }

    // Di antara start dan end = lagi jalan → live
    return MATCH_STATUS.LIVE;
}

/**
 * Sync status pertandingan di DB dengan kenyataan (waktu).
 * Kalo status di DB beda dengan yang seharusnya, update lewat updateStatus.
 */
export async function syncMatchStatus(match, updateStatus) {
    // Hitung status yang bener menurut waktu
    const nextStatus = getMatchStatus(match.startTime, match.endTime);
    // Gak valid (null) → tetapin status lama aja
    if (!nextStatus) {
        return match.status;
    }
    // Baru update kalo emang beda (hemat DB write)
    if (match.status !== nextStatus) {
        await updateStatus(nextStatus);
        match.status = nextStatus;
    }
    return match.status;
}