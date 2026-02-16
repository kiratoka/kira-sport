import { z } from "zod";

// ========== Query & Params ==========

/**
 * Validasi query untuk list matches.
 * limit opsional, akan dicoerce ke number, harus integer positif maksimal 100.
 */
export const listMatchesQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .positive("limit must be positive")
    .max(100, "limit must be at most 100")
    .optional(),
});

// ========== Constants ==========

/** Status pertandingan dalam lowercase untuk konsistensi (DB/API). */
export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};

// ========== Params ==========

/**
 * Validasi param id di URL (e.g. /matches/:id).
 * id wajib, dicoerce ke number, harus integer positif.
 */
export const matchIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int("id must be an integer")
    .positive("id must be positive"),
});

// ========== Body Schemas ==========

/**
 * Helper: cek apakah string adalah ISO date yang valid.
 * Dipakai di refinement supaya startTime/endTime harus format ISO.
 */
function isValidIsoDateString(value) {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Validasi body untuk membuat match baru.
 * - sport, homeTeam, awayTeam: string tidak boleh kosong.
 * - startTime, endTime: string + harus ISO date valid, dan endTime > startTime.
 * - homeScore, awayScore: opsional, integer >= 0.
 */
export const createMatchSchema = z
  .object({
    sport: z.string().min(1, "sport is required"),
    homeTeam: z.string().min(1, "homeTeam is required"),
    awayTeam: z.string().min(1, "awayTeam is required"),
    startTime: z.string(),
    endTime: z.string(),
    homeScore: z.coerce
      .number()
      .int("homeScore must be an integer")
      .min(0, "homeScore must be non-negative")
      .optional(),
    awayScore: z.coerce
      .number()
      .int("awayScore must be an integer")
      .min(0, "awayScore must be non-negative")
      .optional(),
  })
  .refine(
    (data) => isValidIsoDateString(data.startTime),
    { message: "startTime must be a valid ISO date string", path: ["startTime"] }
  )
  .refine(
    (data) => isValidIsoDateString(data.endTime),
    { message: "endTime must be a valid ISO date string", path: ["endTime"] }
  )
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime).getTime();
    const end = new Date(data.endTime).getTime();
    if (end <= start) {
        ctx.addIssue({
        code: "custom",
        message: "endTime must be chronologically after startTime",
        path: ["endTime"],
      });
    }
  });

/**
 * Validasi body untuk update skor match.
 * homeScore dan awayScore wajib, integer non-negatif (coerced).
 */
export const updateScoreSchema = z.object({
  homeScore: z.coerce
    .number()
    .int("homeScore must be an integer")
    .min(0, "homeScore must be non-negative"),
  awayScore: z.coerce
    .number()
    .int("awayScore must be an integer")
    .min(0, "awayScore must be non-negative"),
});
