import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Scissors, Calculator, ExternalLink, Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useUnits } from "@/contexts/UnitsContext";

export default function StringCalculator() {
  const [patternId, setPatternId] = useState("");
  const [desiredLength, setDesiredLength] = useState("");
  const { units, label: unitLabel, toCm, fromCm, formatLength } = useUnits();

  const cleanPatternId = patternId.replace(/^#/, "").replace(/\D/g, "");
  const lengthNum = parseFloat(desiredLength);
  const lengthCm = toCm(lengthNum) ?? 0;

  const canCalculate = cleanPatternId.length > 0 && lengthNum > 0;

  const { data: calcResult, isLoading, error } = trpc.pattern.calculateStrings.useQuery(
    { patternId: cleanPatternId, desiredLengthCm: lengthCm },
    { enabled: canCalculate }
  );

  const pattern = calcResult && "pattern" in calcResult ? calcResult.pattern : null;
  const calculation = calcResult && "calculation" in calcResult ? calcResult.calculation : null;
  const learningData = calcResult && "learningData" in calcResult ? (calcResult as any).learningData : null;
  const errorMsg = calcResult && "error" in calcResult ? (calcResult as any).error : null;

  // Build preview image URL deterministically for instant display
  const previewUrl = cleanPatternId.length > 0
    ? (() => {
        const padded = cleanPatternId.padStart(12, "0");
        const aaa = padded.slice(6, 9);
        const bbb = padded.slice(9, 12);
        return `https://media.braceletbookcdn.com/patterns/000/000/${aaa}/${bbb}/${padded}/preview.png`;
      })()
    : null;

  const displayLength = (cm: number) => formatLength(cm);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl md:text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          String Length Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter a BraceletBook pattern ID and your desired bracelet length. We'll analyze the pattern's knot structure and calculate how long to cut <strong>each individual string</strong>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculator
          </CardTitle>
          <CardDescription>
            Each string ties a different number of knots, so each needs a different length.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>BraceletBook Pattern ID *</Label>
              <Input
                type="text"
                value={patternId}
                onChange={(e) => setPatternId(e.target.value)}
                placeholder="e.g., 207002"
              />
              {cleanPatternId && (
                <a
                  href={`https://www.braceletbook.com/patterns/normal/${cleanPatternId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View on BraceletBook <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="space-y-2">
              <Label>Desired Bracelet Length *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={desiredLength}
                  onChange={(e) => setDesiredLength(e.target.value)}
                  placeholder="e.g., 15"
                  className="flex-1"
                />
                <div className="flex items-center justify-center w-16 rounded-md border bg-muted/50 text-sm font-medium text-muted-foreground">
                  {unitLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Preview */}
          {previewUrl && cleanPatternId && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Pattern Preview</p>
              <div className="overflow-x-auto">
                <img
                  src={previewUrl}
                  alt={`Pattern #${cleanPatternId} preview`}
                  className="h-12 w-auto max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && canCalculate && (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Analyzing pattern knot structure from BraceletBook...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {(errorMsg || error) && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                {errorMsg || "Could not fetch pattern data. Please check the pattern ID and try again."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {pattern && calculation && (
        <>
          {/* Pattern Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Pattern #{pattern.patternId}
                {pattern.author && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    by {pattern.author}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Strings</p>
                  <p className="text-xl font-bold">{pattern.strings}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Dimensions</p>
                  <p className="text-xl font-bold">{pattern.dimensions}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Colors</p>
                  <p className="text-xl font-bold">{pattern.colors}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Total Knots</p>
                  <p className="text-xl font-bold">{pattern.totalKnots}</p>
                </div>
              </div>

              {/* Color swatches */}
              {pattern.colorHexValues.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Colors:</span>
                  <div className="flex gap-1.5">
                    {pattern.colorHexValues.map((hex: string, i: number) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-String Cut Lengths Table */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary" />
                Cut Lengths Per String
              </CardTitle>
              <CardDescription>
                Each string ties a different number of knots, so each needs a different length. Strings that tie more knots use more thread.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="mb-4 p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-xs text-muted-foreground">Average Cut Length</p>
                <p className="text-3xl font-bold text-primary">
                  {displayLength(calculation.averageLengthCm)}
                </p>
              </div>

              {/* Per-string table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">String #</th>
                      <th className="text-center py-2 px-2 font-medium text-muted-foreground">Color</th>
                      <th className="text-center py-2 px-2 font-medium text-muted-foreground">Knots Tied</th>
                      <th className="text-center py-2 px-2 font-medium text-muted-foreground">Knots On</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Cut Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.perString.map((s: any) => {
                      const colorHex = pattern.colorMap?.[s.colorLetter] || "#999";
                      const isMax = s.recommendedLengthCm === Math.max(...calculation.perString.map((x: any) => x.recommendedLengthCm));
                      const isMin = s.recommendedLengthCm === Math.min(...calculation.perString.map((x: any) => x.recommendedLengthCm));
                      return (
                        <tr key={s.index} className="border-b border-muted/50 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-2 font-medium">
                            #{s.index + 1}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div
                                className="w-5 h-5 rounded-full border border-white shadow-sm shrink-0"
                                style={{ backgroundColor: colorHex }}
                              />
                              <span className="text-xs text-muted-foreground uppercase">{s.colorLetter}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="font-mono">{s.knotsTied}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="font-mono text-muted-foreground">{s.knotsOn}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className={`font-bold ${isMax ? "text-primary" : isMin ? "text-muted-foreground" : ""}`}>
                              {displayLength(s.recommendedLengthCm)}
                            </span>
                            {isMax && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 border-primary/30 text-primary">
                                longest
                              </Badge>
                            )}
                            {isMin && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
                                shortest
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Explanation */}
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                {calculation.explanation}
              </p>
            </CardContent>
          </Card>

          {/* Learning Data from Past Bracelets */}
          {learningData && (
            <Card className="border-amber-500/30 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  Your Personal Data
                </CardTitle>
                <CardDescription>
                  Based on {learningData.dataPoints} bracelet{learningData.dataPoints !== 1 ? "s" : ""} you've logged with this pattern.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-white/60 p-3">
                    <p className="text-xs text-muted-foreground">Avg String Used</p>
                    <p className="text-lg font-bold text-amber-700">
                      {displayLength(learningData.avgStringLengthCm)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/60 p-3">
                    <p className="text-xs text-muted-foreground">Avg Leftover</p>
                    <p className="text-lg font-bold text-amber-700">
                      {learningData.avgLeftoverCm != null
                        ? displayLength(learningData.avgLeftoverCm)
                        : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/60 p-3">
                    <p className="text-xs text-muted-foreground">Avg Final Length</p>
                    <p className="text-lg font-bold text-amber-700">
                      {displayLength(learningData.avgFinalLengthCm)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  The per-string estimates above have been adjusted based on your past data. Keep logging your measurements to improve accuracy!
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Per-string analysis:</strong> We parse the pattern's SVG from BraceletBook to count exactly how many knots each string ties vs. how many are tied on it. Strings that tie more knots need more thread because the working string wraps around the passive string.
          </p>
          <p>
            <strong className="text-foreground">Learning from your data:</strong> When you log a completed bracelet with measurements (string cut length, final length, leftover), the calculator adjusts future estimates for the same pattern. The more data you log, the more accurate it gets.
          </p>
          <p>
            <strong className="text-foreground">Better too long than too short:</strong> The recommended lengths include a safety margin. You can always trim excess, but running out of string mid-bracelet means starting over.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
