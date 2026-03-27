/**
 * BraceletBook integration module.
 * Fetches pattern data (image URLs, string count, colors, knot info) from braceletbook.com.
 */

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
}

/**
 * Convert a pattern ID number to the CDN path segments.
 * e.g., 207002 -> { aaa: "207", bbb: "002", padded: "000000207002" }
 */
function patternIdToPath(id: string): { aaa: string; bbb: string; padded: string } {
  const num = id.replace(/^#/, "").replace(/\D/g, "");
  const padded = num.padStart(12, "0");
  // Path segments: 000/000/207/002 for pattern 207002
  // The CDN uses groups of 3 from the padded 12-digit number
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
 * Fetch and parse pattern data from BraceletBook.
 * Scrapes the HTML page for metadata and the SVG for color/knot details.
 */
export async function fetchPatternData(patternId: string): Promise<BraceletBookPattern | null> {
  const cleanId = patternId.replace(/^#/, "").replace(/\D/g, "");
  if (!cleanId || cleanId.length === 0) return null;

  const urls = getPatternImageUrls(cleanId);
  const pageUrl = `https://www.braceletbook.com/patterns/normal/${cleanId}/`;

  try {
    // Fetch the HTML page
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BraceletTracker/1.0)",
      },
    });

    if (!pageRes.ok) {
      console.warn(`[BraceletBook] Failed to fetch pattern page: ${pageRes.status}`);
      return null;
    }

    const html = await pageRes.text();

    // Parse metadata from HTML
    const strings = extractNumber(html, /class="pattern_strings"[^>]*>[\s\S]*?<div class="data">(\d+)<\/div>/);
    const colors = extractNumber(html, /class="pattern_colors"[^>]*>[\s\S]*?<div class="data">(\d+)<\/div>/);
    const dimensions = extractString(html, /class="pattern_dimensions"[^>]*>[\s\S]*?<div class="data">([^<]+)<\/div>/) || "0x0";
    const author = extractString(html, /class="pattern_added_by"[^>]*>[\s\S]*?<a[^>]*>(?:<img[^>]*>)?([^<]+)<\/a>/);

    // Parse dimensions "RxC" for rows
    const dimParts = dimensions.split("x").map((s) => parseInt(s.trim(), 10));
    const rows = dimParts[0] || 0;

    // Fetch the SVG to extract color hex values and knot count
    let colorHexValues: string[] = [];
    let totalKnots = 0;

    try {
      const svgRes = await fetch(urls.patternSvg, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BraceletTracker/1.0)",
        },
      });

      if (svgRes.ok) {
        const svgText = await svgRes.text();

        // Extract color hex values from CSS like: .kk-a{fill:#0c5aad}
        const colorMatches = Array.from(svgText.matchAll(/\.kk-([a-z])\{fill:(#[0-9a-fA-F]{6})\}/g));
        const colorMap = new Map<string, string>();
        for (const match of colorMatches) {
          colorMap.set(match[1], match[2]);
        }
        // Sort by letter order (a, b, c...) and get hex values
        colorHexValues = Array.from(colorMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([, hex]) => hex);

        // Count total knots (each <ellipse with class kk-* is a knot)
        const knotMatches = Array.from(svgText.matchAll(/<ellipse class="kk kk-[a-z]"/g));
        totalKnots = knotMatches.length;
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
 * Calculate recommended string lengths for a pattern.
 * 
 * The formula accounts for:
 * - Desired final bracelet length
 * - Number of knots each string makes (more knots = more string consumed)
 * - A base multiplier for the knotting process
 * - Extra length for tying off ends
 */
export function calculateStringLengths(params: {
  desiredLengthCm: number;
  totalKnots: number;
  numStrings: number;
  rows: number;
}): {
  recommendedLengthCm: number;
  minLengthCm: number;
  maxLengthCm: number;
  knotsPerString: number;
  explanation: string;
} {
  const { desiredLengthCm, totalKnots, numStrings, rows } = params;

  // Each knot consumes approximately 0.3-0.5cm of the knotting string
  // Plus the string needs to span the bracelet length
  const knotsPerString = numStrings > 0 ? Math.ceil(totalKnots / (numStrings / 2)) : 0;
  const knotConsumptionCm = 0.4; // average cm per knot
  const tieOffLengthCm = 10; // extra for tying knots at ends

  // Base: string must be at least as long as the bracelet
  // Plus knot consumption for each knot this string makes
  // Plus tie-off length
  const baseLength = desiredLengthCm;
  const knotLength = knotsPerString * knotConsumptionCm;
  const recommended = baseLength + knotLength + tieOffLengthCm;

  // Provide a range
  const minLength = Math.ceil(recommended * 0.85);
  const maxLength = Math.ceil(recommended * 1.2);

  const explanation = [
    `Based on a ${desiredLengthCm}cm bracelet with ${totalKnots} total knots across ${numStrings} strings:`,
    `Each string makes approximately ${knotsPerString} knots.`,
    `At ~${knotConsumptionCm}cm per knot, that's ${(knotsPerString * knotConsumptionCm).toFixed(1)}cm consumed by knotting.`,
    `Plus ${desiredLengthCm}cm for bracelet length and ${tieOffLengthCm}cm for tying off ends.`,
    `Recommended cut length: ${Math.ceil(recommended)}cm (${(recommended / 2.54).toFixed(1)} inches).`,
  ].join(" ");

  return {
    recommendedLengthCm: Math.ceil(recommended),
    minLengthCm: minLength,
    maxLengthCm: maxLength,
    knotsPerString,
    explanation,
  };
}
