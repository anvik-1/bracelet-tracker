import { describe, expect, it } from "vitest";
import { getPatternImageUrls, calculateStringLengths } from "./braceletbook";

describe("getPatternImageUrls", () => {
  it("generates correct CDN URLs for pattern 207002", () => {
    const urls = getPatternImageUrls("207002");
    expect(urls.previewImage).toBe(
      "https://media.braceletbookcdn.com/patterns/000/000/207/002/000000207002/preview.png"
    );
    expect(urls.patternImage).toBe(
      "https://media.braceletbookcdn.com/patterns/000/000/207/002/000000207002/pattern.png"
    );
    expect(urls.previewSmall).toBe(
      "https://media.braceletbookcdn.com/patterns/000/000/207/002/000000207002/preview_small.png"
    );
    expect(urls.patternSvg).toBe(
      "https://www.braceletbook.com/media/patterns/000/000/207/002/000000207002/pattern.svg"
    );
  });

  it("generates correct URLs for a short pattern ID (1234)", () => {
    const urls = getPatternImageUrls("1234");
    expect(urls.previewImage).toBe(
      "https://media.braceletbookcdn.com/patterns/000/000/001/234/000000001234/preview.png"
    );
  });

  it("handles pattern ID with hash prefix", () => {
    const urls = getPatternImageUrls("#207002");
    expect(urls.previewImage).toContain("000000207002");
  });

  it("handles pattern ID with non-numeric characters", () => {
    const urls = getPatternImageUrls("pattern-207002-test");
    expect(urls.previewImage).toContain("000000207002");
  });

  it("generates correct URLs for pattern 12345", () => {
    const urls = getPatternImageUrls("12345");
    expect(urls.previewImage).toBe(
      "https://media.braceletbookcdn.com/patterns/000/000/012/345/000000012345/preview.png"
    );
  });
});

describe("calculateStringLengths", () => {
  it("calculates string lengths for a typical pattern", () => {
    const result = calculateStringLengths({
      desiredLengthCm: 15,
      totalKnots: 120,
      numStrings: 8,
      rows: 16,
    });

    expect(result.recommendedLengthCm).toBeGreaterThan(15);
    expect(result.minLengthCm).toBeLessThan(result.recommendedLengthCm);
    expect(result.maxLengthCm).toBeGreaterThan(result.recommendedLengthCm);
    expect(result.knotsPerString).toBeGreaterThan(0);
    expect(result.explanation).toContain("15cm");
    expect(result.explanation).toContain("120 total knots");
  });

  it("returns higher length for more complex patterns", () => {
    const simple = calculateStringLengths({
      desiredLengthCm: 15,
      totalKnots: 50,
      numStrings: 4,
      rows: 10,
    });

    const complex = calculateStringLengths({
      desiredLengthCm: 15,
      totalKnots: 300,
      numStrings: 12,
      rows: 30,
    });

    expect(complex.recommendedLengthCm).toBeGreaterThan(simple.recommendedLengthCm);
  });

  it("handles zero strings gracefully", () => {
    const result = calculateStringLengths({
      desiredLengthCm: 15,
      totalKnots: 100,
      numStrings: 0,
      rows: 10,
    });

    expect(result.recommendedLengthCm).toBeGreaterThan(0);
    expect(result.knotsPerString).toBe(0);
  });

  it("scales with desired length", () => {
    const short = calculateStringLengths({
      desiredLengthCm: 10,
      totalKnots: 100,
      numStrings: 8,
      rows: 16,
    });

    const long = calculateStringLengths({
      desiredLengthCm: 25,
      totalKnots: 100,
      numStrings: 8,
      rows: 16,
    });

    expect(long.recommendedLengthCm).toBeGreaterThan(short.recommendedLengthCm);
  });
});
