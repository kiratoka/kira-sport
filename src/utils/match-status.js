// Ambil konstanta status pertandingan (scheduled, live, finished) dari validasi
import { MATCH_STATUS } from '../validation/matches.js';

/**
 * Determine match status based on start and end times.
 *
 * @param {Date|string|number} startTime - Match start time; a Date or a value parseable by Date.
 * @param {Date|string|number} endTime - Match end time; a Date or a value parseable by Date.
 * @param {Date} [now=new Date()] - Reference time for the comparison (useful for testing).
 * @returns {string|null} `MATCH_STATUS.SCHEDULED` if `now` is before `startTime`, `MATCH_STATUS.FINISHED` if `now` is on or after `endTime`, `MATCH_STATUS.LIVE` if `now` is between `startTime` (inclusive) and `endTime` (exclusive); `null` if either input yields an invalid date.
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
 * Ensure a match object's status reflects the current time-based status, updating persistence when it differs.
 * @param {{startTime: string|Date, endTime: string|Date, status: string}} match - Match object containing `startTime`, `endTime`, and current `status`; `status` may be mutated.
 * @param {(newStatus: string) => Promise<void>|(newStatus: string) => void} updateStatus - Function invoked with the new status to persist when an update is required.
 * @returns {string} The match's `status` after synchronization.
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