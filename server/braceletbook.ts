/**
 * BraceletBook integration module.
 * Fetches pattern data (image URLs, string count, colors, knot info) from braceletbook.com.
 * Extracts per-string knot data from SVG for accurate string length calculations.
 */

export interface StringKnotData {
  /** String index (0-based position from left) */
  index: number;
  /** String ID from SVG (e.g., "s00", "s01") */
  svgId: string;
  /** Color letter from SVG (e.g., "a", "b", "c") */
  colorLetter: string;
  /** Number of half-hitches this string ties (working string) */
  knotsTied: number;
  /** Number of half-hitches tied ON this string (passive string) */
  knotsOn: number;
  /** Total half-hitches this string participates in */
  totalKnots: number;
  /** Recommended cut length in cm for this string */
  recommendedLengthCm: number;
}

export interface BraceletBookPattern {
  patternId: string;
  patternUrl: string;
  previewImageUrl: string;
  patternImageUrl: string;
  previewSmallUrl: string;
  strings: number;
  rows: number;
  colors: number;
  dimensions: string;
  colorHexValues: string[];
  totalKnots: number;
  author: string | null;
  /** Per-string knot analysis extracted from SVG */
  perStringData: StringKnotData[];
  /** Color letter to hex mapping (e.g., { a: "#0c5aad", b: "#25ad40" }) */
  colorMap: Record<string, string>;
}

/**
 * Convert a pattern ID number to the CDN path segments.
 */
function patternIdToPath(id: string): { aaa: string; bbb: string; padded: string } {
  const num = id.replace(/^#/, "").replace(/\D/g, "");
  const padded = num.padStart(12, "0");
  const aaa = padded.slice(6, 9);
  const bbb = padded.slice(9, 12);
  return { aaa, bbb, padded };
}

/**
 * Build deterministic image URLs from a pattern ID.
 */
export function getPatternImageUrls(patternId: string) {
  const { aaa, bbb, padded } = patternIdToPath(patternId);
  const baseCdn = `https://media.braceletbookcdn.com/patterns/000/000/${aaa}/${bbb}/${padded}`;
  const baseSvg = `https://www.braceletbook.com/media/patterns/000/000/${aaa}/${bbb}/${padded}`;

  return {
    previewImage: `${baseCdn}/preview.png`,
    previewSmall: `${baseCdn}/preview_small.png`,
    previewSmall2x: `${baseCdn}/preview_small_2x.png`,
    patternImage: `${baseCdn}/pattern.png`,
    patternSvg: `${baseSvg}/pattern.svg`,
    previewSvg: `${baseSvg}/preview.svg`,
  };
}

/**
 * Parse the SVG to extract per-string knot data.
 *
 * SVG structure:
 * - String paths: <path id="sXY" d="M x y ..."> where X=color pair index, Y=0 or 1
 * - Knot groups: <g class="k"> with ellipse (position/color) and 2 use elements (half-hitches)
 * - Each use references #kf (forward = left string ties) or #kb (backward = right string ties)
 */
export function parsePerStringKnotData(svgText: string): {
  perStringData: Array<{ svgId: string; colorLetter: string; knotsTied: number; knotsOn: number }>;
  colorMap: Record<string, string>;
  totalKnots: number;
} {
  // Extract color hex values from CSS: .kk-a{fill:#0c5aad}
  const colorMatches = Array.from(svgText.matchAll(/\.kk-([a-z])\{fill:(#[0-9a-fA-F]{6})\}/g));
  const colorMap: Record<string, string> = {};
  for (const match of colorMatches) {
    colorMap[match[1]] = match[2];
  }

  // Extract string paths: <path id="sXY" d="M ...">
  const stringPathMatches = Array.from(svgText.matchAll(/<path id="(s\d\d)" d="([^"]+)"/g));
  const stringPositions: Record<string, Record<number, number>> = {}; // {svgId: {y: x}}

  for (const [, sid, d] of stringPathMatches) {
    const coords = d.replace("M ", "").split(/\s+/).map(Number);
    const positions: Record<number, number> = {};
    for (let i = 0; i < coords.length; i += 2) {
      positions[coords[i + 1]] = coords[i];
    }
    stringPositions[sid] = positions;
  }

  // Build reverse map: (x,y) -> [string IDs]
  const posToStrings: Record<string, string[]> = {};
  for (const [sid, positions] of Object.entries(stringPositions)) {
    for (const [y, x] of Object.entries(positions)) {
      const key = `${x},${y}`;
      if (!posToStrings[key]) posToStrings[key] = [];
      posToStrings[key].push(sid);
    }
  }

  // Extract knot groups: position (cx, cy) and two half-hitch directions
  const knotMatches = Array.from(
    svgText.matchAll(
      /<g class="k"><ellipse class="kk kk-(\w+)" cx="(\d+)" cy="(\d+)"[^/]*\/><use class="a0 a0_\w" x="\d+" y="\d+" xlink:href="#(k\w)"[^/]*\/><use class="a1 a1_\w" x="\d+" y="\d+" xlink:href="#(k\w)"[^/]*\/><\/g>/g
    )
  );

  // Determine string color from SVG: string sXY uses color letter at index X
  // The color is determined by the CSS class .s1-X{stroke:#hex}
  const stringColorMatches = Array.from(svgText.matchAll(/\.s1-([a-z])\{stroke:(#[0-9a-fA-F]{6})\}/g));
  const strokeToLetter: Record<string, string> = {};
  for (const [, letter] of stringColorMatches) {
    strokeToLetter[letter] = letter;
  }

  // Map string IDs to color letters: sXY where X is the color pair index
  // The string paths are rendered with class s1-{letter}, but the ID encodes the pair index
  // For an 8-string pattern: s00,s01=color pair 0, s10,s11=color pair 1, etc.
  // We need to match pair index to color letter from the <use> elements
  // Actually, the string color is shown by the <use class="s1 s1-{letter}"> elements
  const stringUseMatches = Array.from(svgText.matchAll(/<use class="s1 s1-([a-z])" [^>]*xlink:href="#(s\d\d)"/g));
  const stringToColor: Record<string, string> = {};
  for (const [, letter, sid] of stringUseMatches) {
    stringToColor[sid] = letter;
  }

  // Initialize per-string counters
  const knotsTied: Record<string, number> = {};
  const knotsOn: Record<string, number> = {};
  const allStringIds = Object.keys(stringPositions).sort();

  for (const sid of allStringIds) {
    knotsTied[sid] = 0;
    knotsOn[sid] = 0;
  }

  // Process each knot
  let totalKnots = 0;
  for (const [, , cx, cy, dir1, dir2] of knotMatches) {
    totalKnots++;
    const key = `${cx},${cy}`;
    const stringsHere = posToStrings[key];
    if (!stringsHere || stringsHere.length !== 2) continue;

    // Determine left vs right string at this knot position
    // The string with the lower x-position BEFORE the knot row is the "left" string
    const knotY = parseInt(cy, 10);
    const sorted = [...stringsHere].sort((a, b) => {
      // Find each string's x position at the row before this knot
      const posA = stringPositions[a];
      const posB = stringPositions[b];
      // Get the y-values just before the knot y
      const ysBefore_A = Object.keys(posA).map(Number).filter((y) => y < knotY).sort((x, y) => y - x);
      const ysBefore_B = Object.keys(posB).map(Number).filter((y) => y < knotY).sort((x, y) => y - x);
      const xA = ysBefore_A.length > 0 ? posA[ysBefore_A[0]] : posA[knotY];
      const xB = ysBefore_B.length > 0 ? posB[ysBefore_B[0]] : posB[knotY];
      return xA - xB;
    });

    const leftString = sorted[0];
    const rightString = sorted[1];

    // Each knot has 2 half-hitches
    for (const dir of [dir1, dir2]) {
      if (dir === "kf") {
        // Forward: left string is working (ties the knot)
        knotsTied[leftString]++;
        knotsOn[rightString]++;
      } else if (dir === "kb") {
        // Backward: right string is working (ties the knot)
        knotsTied[rightString]++;
        knotsOn[leftString]++;
      }
    }
  }

  // Build per-string data sorted by original position (left to right)
  const perStringData = allStringIds.map((sid) => ({
    svgId: sid,
    colorLetter: stringToColor[sid] || "?",
    knotsTied: knotsTied[sid],
    knotsOn: knotsOn[sid],
  }));

  return { perStringData, colorMap, totalKnots };
}

/**
 * Fetch and parse pattern data from BraceletBook.
 */
export async function fetchPatternData(patternId: string): Promise<BraceletBookPattern | null> {
  const cleanId = patternId.replace(/^#/, "").replace(/\D/g, "");
  if (!cleanId || cleanId.length === 0) return null;

  const urls = getPatternImageUrls(cleanId);
  const pageUrl = `https://www.braceletbook.com/patterns/normal/${cleanId}/`;

  try {
    const pageRes = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BraceletTracker/1.0)" },
    });

    if (!pageRes.ok) {
      console.warn(`[BraceletBook] Failed to fetch pattern page: ${pageRes.status}`);
      return null;
    }

    const html = await pageRes.text();

    const strings = extractNumber(html, /class="pattern_strings"[^>]*>[\s\S]*?<div class="data">(\d+)<\/div>/);
    const colors = extractNumber(html, /class="pattern_colors"[^>]*>[\s\S]*?<div class="data">(\d+)<\/div>/);
    const dimensions =
      extractString(html, /class="pattern_dimensions"[^>]*>[\s\S]*?<div class="data">([^<]+)<\/div>/) || "0x0";
    const author = extractString(
      html,
      /class="pattern_added_by"[^>]*>[\s\S]*?<a[^>]*>(?:<img[^>]*>)?([^<]+)<\/a>/
    );

    const dimParts = dimensions.split("x").map((s) => parseInt(s.trim(), 10));
    const rows = dimParts[0] || 0;

    // Fetch SVG for per-string knot analysis
    let colorHexValues: string[] = [];
    let totalKnots = 0;
    let perStringData: StringKnotData[] = [];
    let colorMap: Record<string, string> = {};

    try {
      const svgRes = await fetch(urls.patternSvg, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BraceletTracker/1.0)" },
      });

      if (svgRes.ok) {
        const svgText = await svgRes.text();
        const parsed = parsePerStringKnotData(svgText);

        colorMap = parsed.colorMap;
        totalKnots = parsed.totalKnots;

        // Build colorHexValues sorted by letter
        colorHexValues = Object.entries(parsed.colorMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([, hex]) => hex);

        // Build full per-string data with indices
        perStringData = parsed.perStringData.map((s, i) => ({
          index: i,
          svgId: s.svgId,
          colorLetter: s.colorLetter,
          knotsTied: s.knotsTied,
          knotsOn: s.knotsOn,
          totalKnots: s.knotsTied + s.knotsOn,
          recommendedLengthCm: 0, // filled in by calculateStringLengths
        }));
      }
    } catch (svgErr) {
      console.warn("[BraceletBook] Failed to fetch SVG:", svgErr);
    }

    return {
      patternId: cleanId,
      patternUrl: pageUrl,
      previewImageUrl: urls.previewImage,
      patternImageUrl: urls.patternImage,
      previewSmallUrl: urls.previewSmall,
      strings: strings || 0,
      rows,
      colors: colors || 0,
      dimensions,
      colorHexValues,
      totalKnots,
      author,
      perStringData,
      colorMap,
    };
  } catch (err) {
    console.error("[BraceletBook] Error fetching pattern:", err);
    return null;
  }
}

function extractNumber(html: string, regex: RegExp): number | null {
  const match = html.match(regex);
  if (match && match[1]) {
    const num = parseInt(match[1].trim(), 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

function extractString(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Calculate recommended string lengths PER STRING for a pattern.
 *
 * Each string ties a different number of knots, so each needs a different length.
 * The working string (tying knots) consumes more thread than the passive string.
 *
 * Formula per string:
 *   length = desiredBraceletLength
 *          + (knotsTied * knotConsumptionCm)  // wrapping uses thread
 *          + tieOffLength                      // for start/end knots
 *
 * The knot counts from the SVG represent ONE pattern repeat.
 * For a full bracelet, we scale by how many repeats fit in the desired length.
 */
export function calculatePerStringLengths(params: {
  desiredLengthCm: number;
  perStringData: Array<{ svgId: string; colorLetter: string; knotsTied: number; knotsOn: number }>;
  rows: number;
  numStrings: number;
  /** Optional: historical data from past bracelets with this pattern */
  historicalAdjustment?: number;
}): {
  perString: StringKnotData[];
  averageLengthCm: number;
  explanation: string;
} {
  const { desiredLengthCm, perStringData, rows, numStrings, historicalAdjustment } = params;

  // Estimate how many pattern repeats fit in the desired length
  // A typical pattern repeat produces ~1-2cm of bracelet length per row
  // Normal patterns: ~0.15cm per row of knots
  const cmPerRow = 0.15;
  const patternRepeatLengthCm = rows * cmPerRow;
  const repeats = patternRepeatLengthCm > 0 ? desiredLengthCm / patternRepeatLengthCm : 1;

  const knotConsumptionCm = 0.35; // cm of thread consumed per half-hitch tied
  const tieOffLengthCm = 12; // extra for tying knots at start/end

  const adjustment = historicalAdjustment || 0;

  const perString: StringKnotData[] = perStringData.map((s, i) => {
    // Scale knot counts by number of repeats
    const scaledKnotsTied = s.knotsTied * repeats;
    const scaledKnotsOn = s.knotsOn * repeats;

    // Working string uses more thread per knot it ties
    const knotLength = scaledKnotsTied * knotConsumptionCm;

    // Total recommended length
    let recommended = desiredLengthCm + knotLength + tieOffLengthCm + adjustment;

    // Minimum safety: at least 2x the desired length
    recommended = Math.max(recommended, desiredLengthCm * 2);

    return {
      index: i,
      svgId: s.svgId,
      colorLetter: s.colorLetter,
      knotsTied: s.knotsTied,
      knotsOn: s.knotsOn,
      totalKnots: s.knotsTied + s.knotsOn,
      recommendedLengthCm: Math.ceil(recommended),
    };
  });

  const avgLength = perString.length > 0
    ? Math.ceil(perString.reduce((sum, s) => sum + s.recommendedLengthCm, 0) / perString.length)
    : 0;

  const maxKnotter = perString.reduce((max, s) => (s.knotsTied > max.knotsTied ? s : max), perString[0]);
  const minKnotter = perString.reduce((min, s) => (s.knotsTied < min.knotsTied ? s : min), perString[0]);

  const explanation = [
    `For a ${desiredLengthCm}cm bracelet with ${numStrings} strings and ${rows} rows per repeat (~${repeats.toFixed(1)} repeats needed):`,
    `String #${(maxKnotter?.index ?? 0) + 1} ties the most knots (${maxKnotter?.knotsTied ?? 0}/repeat) and needs ${maxKnotter?.recommendedLengthCm ?? 0}cm.`,
    `String #${(minKnotter?.index ?? 0) + 1} ties the fewest knots (${minKnotter?.knotsTied ?? 0}/repeat) and needs ${minKnotter?.recommendedLengthCm ?? 0}cm.`,
    historicalAdjustment
      ? `Adjusted by ${adjustment > 0 ? "+" : ""}${adjustment.toFixed(1)}cm based on your past bracelets.`
      : "Log your actual string usage to improve future estimates!",
  ].join(" ");

  return { perString, averageLengthCm: avgLength, explanation };
}
