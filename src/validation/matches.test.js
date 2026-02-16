/**
 * Test validasi matches (Zod schemas).
 * Jalanin: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import {
  listMatchesQuerySchema,
  MATCH_STATUS,
  matchIdParamSchema,
  createMatchSchema,
  updateScoreSchema,
} from "./matches.js";

// --- listMatchesQuerySchema ---
describe("listMatchesQuerySchema", () => {
  it("menerima query kosong (limit opsional)", () => {
    const result = listMatchesQuerySchema.safeParse({});
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.data, {});
  });

  it("menerima limit valid dan me-coerce string ke number", () => {
    const result = listMatchesQuerySchema.safeParse({ limit: "10" });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.limit, 10);
  });

  it("menerima limit 100 (batas maksimal)", () => {
    const result = listMatchesQuerySchema.safeParse({ limit: 100 });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.limit, 100);
  });

  it("menolak limit > 100", () => {
    const result = listMatchesQuerySchema.safeParse({ limit: 101 });
    assert.strictEqual(result.success, false);
  });

  it("menolak limit 0 atau negatif", () => {
    assert.strictEqual(listMatchesQuerySchema.safeParse({ limit: 0 }).success, false);
    assert.strictEqual(listMatchesQuerySchema.safeParse({ limit: -1 }).success, false);
  });

  it("menolak limit bukan integer", () => {
    const result = listMatchesQuerySchema.safeParse({ limit: 10.5 });
    assert.strictEqual(result.success, false);
  });
});

// --- MATCH_STATUS ---
describe("MATCH_STATUS", () => {
  it("punya nilai lowercase untuk SCHEDULED, LIVE, FINISHED", () => {
    assert.strictEqual(MATCH_STATUS.SCHEDULED, "scheduled");
    assert.strictEqual(MATCH_STATUS.LIVE, "live");
    assert.strictEqual(MATCH_STATUS.FINISHED, "finished");
  });
});

// --- matchIdParamSchema ---
describe("matchIdParamSchema", () => {
  it("menerima id positif dan me-coerce string", () => {
    const result = matchIdParamSchema.safeParse({ id: "42" });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.id, 42);
  });

  it("menolak id tidak ada (required)", () => {
    const result = matchIdParamSchema.safeParse({});
    assert.strictEqual(result.success, false);
  });

  it("menolak id 0 atau negatif", () => {
    assert.strictEqual(matchIdParamSchema.safeParse({ id: 0 }).success, false);
    assert.strictEqual(matchIdParamSchema.safeParse({ id: -1 }).success, false);
  });
});

// --- createMatchSchema ---
describe("createMatchSchema", () => {
  const validBase = {
    sport: "Football",
    homeTeam: "Team A",
    awayTeam: "Team B",
    startTime: "2025-03-01T10:00:00.000Z",
    endTime: "2025-03-01T12:00:00.000Z",
  };

  it("menerima body valid tanpa score", () => {
    const result = createMatchSchema.safeParse(validBase);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.sport, "Football");
    assert.strictEqual(result.data.homeScore, undefined);
  });

  it("menerima body valid dengan homeScore dan awayScore opsional", () => {
    const result = createMatchSchema.safeParse({
      ...validBase,
      homeScore: "2",
      awayScore: "1",
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.homeScore, 2);
    assert.strictEqual(result.data.awayScore, 1);
  });

  it("menolak sport/homeTeam/awayTeam kosong", () => {
    assert.strictEqual(
      createMatchSchema.safeParse({ ...validBase, sport: "" }).success,
      false
    );
    assert.strictEqual(
      createMatchSchema.safeParse({ ...validBase, homeTeam: "" }).success,
      false
    );
    assert.strictEqual(
      createMatchSchema.safeParse({ ...validBase, awayTeam: "" }).success,
      false
    );
  });

  it("menolak startTime bukan ISO date valid", () => {
    const result = createMatchSchema.safeParse({
      ...validBase,
      startTime: "bukan-tanggal",
    });
    assert.strictEqual(result.success, false);
  });

  it("menolak endTime bukan ISO date valid", () => {
    const result = createMatchSchema.safeParse({
      ...validBase,
      endTime: "invalid",
    });
    assert.strictEqual(result.success, false);
  });

  it("menolak endTime sama atau sebelum startTime (superRefine)", () => {
    const sameTime = createMatchSchema.safeParse({
      ...validBase,
      startTime: "2025-03-01T10:00:00.000Z",
      endTime: "2025-03-01T10:00:00.000Z",
    });
    assert.strictEqual(sameTime.success, false);

    const endBeforeStart = createMatchSchema.safeParse({
      ...validBase,
      startTime: "2025-03-01T12:00:00.000Z",
      endTime: "2025-03-01T10:00:00.000Z",
    });
    assert.strictEqual(endBeforeStart.success, false);
  });

  it("menerima homeScore/awayScore 0", () => {
    const result = createMatchSchema.safeParse({
      ...validBase,
      homeScore: 0,
      awayScore: 0,
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.homeScore, 0);
    assert.strictEqual(result.data.awayScore, 0);
  });

  it("menolak homeScore/awayScore negatif", () => {
    assert.strictEqual(
      createMatchSchema.safeParse({ ...validBase, homeScore: -1 }).success,
      false
    );
    assert.strictEqual(
      createMatchSchema.safeParse({ ...validBase, awayScore: -1 }).success,
      false
    );
  });
});

// --- updateScoreSchema ---
describe("updateScoreSchema", () => {
  it("menerima homeScore dan awayScore valid (coerced)", () => {
    const result = updateScoreSchema.safeParse({
      homeScore: "3",
      awayScore: "2",
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.homeScore, 3);
    assert.strictEqual(result.data.awayScore, 2);
  });

  it("menerima skor 0", () => {
    const result = updateScoreSchema.safeParse({
      homeScore: 0,
      awayScore: 0,
    });
    assert.strictEqual(result.success, true);
  });

  it("menolak jika homeScore atau awayScore hilang", () => {
    assert.strictEqual(
      updateScoreSchema.safeParse({ awayScore: 1 }).success,
      false
    );
    assert.strictEqual(
      updateScoreSchema.safeParse({ homeScore: 1 }).success,
      false
    );
  });

  it("menolak skor negatif", () => {
    assert.strictEqual(
      updateScoreSchema.safeParse({ homeScore: -1, awayScore: 0 }).success,
      false
    );
    assert.strictEqual(
      updateScoreSchema.safeParse({ homeScore: 0, awayScore: -1 }).success,
      false
    );
  });
});
