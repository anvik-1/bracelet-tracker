import { describe, expect, it } from "vitest";
import { getPatternImageUrls, calculatePerStringLengths, parsePerStringKnotData } from "./braceletbook";

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

describe("parsePerStringKnotData", () => {
  // Minimal SVG snippet simulating a 4-string pattern with 2 rows
  const minimalSvg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs><style type="text/css"><![CDATA[
.s1-a{stroke:#ff0000}.kk-a{fill:#ff0000}
.s1-b{stroke:#0000ff}.kk-b{fill:#0000ff}
]]></style>
<path id="s00" d="M 44 10 44 36 63 55 101 93 82 130" />
<path id="s01" d="M 82 10 82 36 63 55 44 93 63 130" />
<path id="s10" d="M 120 10 120 36 101 55 82 93 101 130" />
<path id="s11" d="M 158 10 158 36 101 55 63 93 44 130" />
</defs>
<use class="s1 s1-a" xlink:href="#s00" />
<use class="s1 s1-a" xlink:href="#s01" />
<use class="s1 s1-b" xlink:href="#s10" />
<use class="s1 s1-b" xlink:href="#s11" />
<g class="k"><ellipse class="kk kk-a" cx="63" cy="55" rx="18" ry="22" /><use class="a0 a0_w" x="63" y="55" xlink:href="#kf" /><use class="a1 a1_w" x="63" y="55" xlink:href="#kf" /></g>
<g class="k"><ellipse class="kk kk-b" cx="101" cy="55" rx="18" ry="22" /><use class="a0 a0_w" x="101" y="55" xlink:href="#kb" /><use class="a1 a1_w" x="101" y="55" xlink:href="#kb" /></g>
<g class="k"><ellipse class="kk kk-a" cx="63" cy="93" rx="18" ry="22" /><use class="a0 a0_b" x="63" y="93" xlink:href="#kf" /><use class="a1 a1_b" x="63" y="93" xlink:href="#kb" /></g>
<g class="k"><ellipse class="kk kk-b" cx="101" cy="93" rx="18" ry="22" /><use class="a0 a0_w" x="101" y="93" xlink:href="#kb" /><use class="a1 a1_w" x="101" y="93" xlink:href="#kf" /></g>
</svg>`;

  it("extracts color map from SVG CSS", () => {
    const result = parsePerStringKnotData(minimalSvg);
    expect(result.colorMap).toEqual({ a: "#ff0000", b: "#0000ff" });
  });

  it("counts total knots from SVG", () => {
    const result = parsePerStringKnotData(minimalSvg);
    expect(result.totalKnots).toBe(4);
  });

  it("extracts per-string data for all strings", () => {
    const result = parsePerStringKnotData(minimalSvg);
    expect(result.perStringData).toHaveLength(4);
    expect(result.perStringData.map((s) => s.svgId)).toEqual(["s00", "s01", "s10", "s11"]);
  });

  it("assigns color letters to strings", () => {
    const result = parsePerStringKnotData(minimalSvg);
    expect(result.perStringData[0].colorLetter).toBe("a");
    expect(result.perStringData[1].colorLetter).toBe("a");
    expect(result.perStringData[2].colorLetter).toBe("b");
    expect(result.perStringData[3].colorLetter).toBe("b");
  });

  it("counts knots tied and knots on per string", () => {
    const result = parsePerStringKnotData(minimalSvg);
    // Each string should have some combination of tied/on knots
    for (const s of result.perStringData) {
      expect(s.knotsTied + s.knotsOn).toBeGreaterThanOrEqual(0);
    }
    // Total tied should equal total on (each half-hitch has one tier and one passive)
    const totalTied = result.perStringData.reduce((sum, s) => sum + s.knotsTied, 0);
    const totalOn = result.perStringData.reduce((sum, s) => sum + s.knotsOn, 0);
    expect(totalTied).toBe(totalOn);
  });

  it("returns empty data for SVG with no knots", () => {
    const emptySvg = `<svg><defs><style>.kk-a{fill:#ff0000}</style></defs></svg>`;
    const result = parsePerStringKnotData(emptySvg);
    expect(result.totalKnots).toBe(0);
    expect(result.perStringData).toHaveLength(0);
  });
});

describe("calculatePerStringLengths", () => {
  const mockPerStringData = [
    { svgId: "s00", colorLetter: "a", knotsTied: 4, knotsOn: 24 },
    { svgId: "s01", colorLetter: "a", knotsTied: 14, knotsOn: 14 },
    { svgId: "s10", colorLetter: "b", knotsTied: 20, knotsOn: 8 },
    { svgId: "s11", colorLetter: "b", knotsTied: 24, knotsOn: 4 },
    { svgId: "s20", colorLetter: "c", knotsTied: 20, knotsOn: 8 },
    { svgId: "s21", colorLetter: "c", knotsTied: 20, knotsOn: 8 },
    { svgId: "s30", colorLetter: "a", knotsTied: 10, knotsOn: 18 },
    { svgId: "s31", colorLetter: "a", knotsTied: 0, knotsOn: 28 },
  ];

  it("returns per-string results for all strings", () => {
    const result = calculatePerStringLengths({
      desiredLengthCm: 15,
      perStringData: mockPerStringData,
      rows: 16,
      numStrings: 8,
    });

    expect(result.perString).toHaveLength(8);
    expect(result.averageLengthCm).toBeGreaterThan(0);
    expect(result.explanation).toContain("15cm");
  });

  it("gives longer lengths to strings that tie more knots", () => {
    const result = calculatePerStringLengths({
      desiredLengthCm: 15,
      perStringData: mockPerStringData,
      rows: 16,
      numStrings: 8,
    });

    // s11 ties 24 knots, s31 ties 0 knots
    const s11 = result.perString.find((s) => s.svgId === "s11")!;
    const s31 = result.perString.find((s) => s.svgId === "s31")!;

    expect(s11.recommendedLengthCm).toBeGreaterThan(s31.recommendedLengthCm);
  });

  it("scales with desired length", () => {
    const short = calculatePerStringLengths({
      desiredLengthCm: 10,
      perStringData: mockPerStringData,
      rows: 16,
      numStrings: 8,
    });

    const long = calculatePerStringLengths({
      desiredLengthCm: 25,
      perStringData: mockPerStringData,
      rows: 16,
      numStrings: 8,
    });

    expect(long.averageLengthCm).toBeGreaterThan(short.averageLengthCm);
  });

  it("applies historical adjustment to reduce estimates", () => {
    const withoutHistory = calculatePerStringLengths({
      desiredLengthCm: 15,
      perStringData: mockPerStringData,
      rows: 16,
      numStrings: 8,
    });

    const withHistory = calculatePerStringLengths({
      desiredLengthCm: 15,
      perStringData: mockPerStringData,
      rows: 16,
      numStrings: 8,
      historicalAdjustment: -5,
    });

    // With negative adjustment, lengths should be shorter
    expect(withHistory.averageLengthCm).toBeLessThanOrEqual(withoutHistory.averageLengthCm);
  });

  it("ensures minimum length of 2x desired length", () => {
    const result = calculatePerStringLengths({
      desiredLengthCm: 15,
      perStringData: [
        { svgId: "s00", colorLetter: "a", knotsTied: 0, knotsOn: 0 },
      ],
      rows: 1,
      numStrings: 1,
    });

    // Even with 0 knots, minimum should be 2x desired
    expect(result.perString[0].recommendedLengthCm).toBeGreaterThanOrEqual(30);
  });

  it("handles empty per-string data", () => {
    const result = calculatePerStringLengths({
      desiredLengthCm: 15,
      perStringData: [],
      rows: 0,
      numStrings: 0,
    });

    expect(result.perString).toHaveLength(0);
    expect(result.averageLengthCm).toBe(0);
  });
});
