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
import { Scissors, Calculator, ExternalLink, Loader2, AlertCircle, History, TrendingUp } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function StringCalculator() {
  const [patternId, setPatternId] = useState("");
  const [desiredLength, setDesiredLength] = useState("");
  const [unit, setUnit] = useState("cm");

  const cleanPatternId = patternId.replace(/^#/, "").replace(/\D/g, "");
  const lengthNum = parseFloat(desiredLength);
  const lengthCm = unit === "inches" ? lengthNum * 2.54 : lengthNum;

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

  const displayLength = (cm: number) => {
    if (unit === "inches") {
      return `${(cm / 2.54).toFixed(1)} in`;
    }
    return `${Math.ceil(cm)} cm`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl md:text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          String Length Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter a BraceletBook pattern ID and your desired bracelet length. We'll fetch the pattern details and calculate how long to cut each string.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculator
          </CardTitle>
          <CardDescription>
            Paste a BraceletBook pattern number and your desired final bracelet length.
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
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="inches">inches</SelectItem>
                  </SelectContent>
                </Select>
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
              <p className="text-sm text-muted-foreground">Fetching pattern data from BraceletBook...</p>
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

      {/* Result */}
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

          {/* Calculation Result */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Scissors className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recommended String Length</p>
                  <p className="text-4xl font-bold text-primary mt-1">
                    {displayLength(calculation.recommendedLengthCm)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">per string</p>
                </div>
                <div className="pt-3 border-t border-primary/10">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Min Length</p>
                      <p className="font-medium text-sm">{displayLength(calculation.minLengthCm)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Knots/String</p>
                      <p className="font-medium text-sm">~{calculation.knotsPerString}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max Length</p>
                      <p className="font-medium text-sm">{displayLength(calculation.maxLengthCm)}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2 max-w-md mx-auto">
                  {calculation.explanation}
                </p>
              </div>
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
                {learningData.personalRecommendation && (
                  <div className="mt-4 p-3 rounded-lg bg-white/60 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <History className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Personal Recommendation</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Based on your past results, cut your strings to{" "}
                          <strong>{displayLength(learningData.personalRecommendation)}</strong> for a{" "}
                          {displayLength(lengthCm)} bracelet.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
            <strong className="text-foreground">How it works:</strong> We fetch the pattern's SVG from BraceletBook, count the total knots, and calculate how much string each knot consumes (~0.4cm per knot) plus your desired length and tie-off room.
          </p>
          <p>
            <strong className="text-foreground">Learning from your data:</strong> When you log a completed bracelet with measurements (string cut length, final length, leftover), the calculator uses that data to give you personalized recommendations for the same pattern.
          </p>
          <p>
            <strong className="text-foreground">Better too long than too short:</strong> The recommended length includes a safety margin. You can always trim excess, but running out of string mid-bracelet means starting over.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
