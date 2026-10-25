import { describe, expect, it } from "vitest";
import {
  consultationContributions,
  dayKey,
  diffContributions,
  feedbackContributions,
  toNested,
  userContributions,
} from "../src/statsModel.js";

const scan = {
  userId: "u1",
  source: "FACE_SCAN",
  faceShape: "OVAL",
  hairLength: "SHORT",
  hairTexture: "STRAIGHT",
  selectedHaircutId: null,
  isFavorite: false,
  faceShapeConfidence: 0.8,
  hairLengthConfidence: 0.6,
  hairTextureConfidence: 0.9,
  sourcesAgreed: true,
};

const nested = (before: object | undefined, after: object | undefined, contributions = consultationContributions) =>
  toNested(diffContributions(contributions(before as never), contributions(after as never)), (v) => v);

describe("consultation stats", () => {
  it("counts a new scan in every breakdown", () => {
    expect(nested(undefined, scan)).toEqual({
      consultations: {
        total: 1,
        bySource: { FACE_SCAN: 1 },
        byFaceShape: { OVAL: 1 },
        byHairLength: { SHORT: 1 },
        byHairTexture: { STRAIGHT: 1 },
        quality: {
          analysed: 1,
          faceShapeConfidenceSum: 0.8,
          hairLengthConfidenceSum: 0.6,
          hairTextureConfidenceSum: 0.9,
          sourcesAgreed: 1,
        },
      },
    });
  });

  it("only moves the haircut and favorite counters when the app re-saves with a pick", () => {
    const picked = { ...scan, selectedHaircutId: "SHORT_WAVY_4", isFavorite: true };
    expect(nested(scan, picked)).toEqual({
      consultations: {
        byHaircut: { SHORT_WAVY_4: 1 },
        favorites: 1,
        favoritesByHaircut: { SHORT_WAVY_4: 1 },
      },
    });
  });

  it("subtracts everything when a consultation is deleted", () => {
    const removed = nested(scan, undefined) as { consultations: { total: number; byFaceShape: object } };
    expect(removed.consultations.total).toBe(-1);
    expect(removed.consultations.byFaceShape).toEqual({ OVAL: -1 });
  });

  it("skips quality counters for documents from older app versions", () => {
    const { faceShapeConfidence: _, ...legacy } = scan;
    expect(nested(undefined, legacy)).not.toHaveProperty("consultations.quality");
  });

  it("keeps ids with dots as literal keys", () => {
    const picked = { ...scan, selectedHaircutId: "v1.2" };
    expect(nested(scan, picked)).toEqual({ consultations: { byHaircut: { "v1.2": 1 } } });
  });
});

describe("feedback and user stats", () => {
  it("tracks rating sum and distribution", () => {
    expect(nested(undefined, { rating: 4 }, feedbackContributions)).toEqual({
      feedback: { total: 1, ratingSum: 4, byRating: { "4": 1 } },
    });
  });

  it("moves a user between gender buckets when the profile changes", () => {
    expect(nested({ gender: "MALE" }, { gender: "FEMALE" }, userContributions)).toEqual({
      users: { byGender: { MALE: -1, FEMALE: 1 } },
    });
  });
});

describe("dayKey", () => {
  it("uses Philippine time for day boundaries", () => {
    // 2026-10-17T17:30:00Z is already 01:30 on the 18th in Manila (UTC+8).
    expect(dayKey(Date.UTC(2026, 9, 17, 17, 30))).toBe("2026-10-18");
  });
});
