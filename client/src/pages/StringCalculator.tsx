import { Button } from "@/components/ui/button";
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
import { Scissors, Calculator, Info } from "lucide-react";
import { useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function StringCalculator() {
  const [desiredLength, setDesiredLength] = useState("");
  const [totalKnots, setTotalKnots] = useState("");
  const [knotsPerString, setKnotsPerString] = useState("");
  const [numberOfStrings, setNumberOfStrings] = useState("");
  const [knotType, setKnotType] = useState("forward");
  const [unit, setUnit] = useState("cm");

  // Knot consumption factors (cm per knot for the knotting string)
  const knotFactors: Record<string, number> = {
    forward: 0.3,
    backward: 0.3,
    forward_backward: 0.35,
    backward_forward: 0.35,
    chinese: 0.5,
  };

  const result = useMemo(() => {
    const length = parseFloat(desiredLength);
    const knots = parseInt(totalKnots);
    const perString = parseInt(knotsPerString);
    const strings = parseInt(numberOfStrings);

    if (!length || length <= 0) return null;

    const factor = knotFactors[knotType] || 0.3;

    // Base string length calculation
    // Each knot consumes ~factor cm of the knotting string
    // We also add extra for tying off ends
    const tieOffExtra = 10; // cm for tying knots at each end
    const safetyMargin = 1.15; // 15% safety margin

    let stringLength: number;

    if (knots && perString && strings) {
      // Detailed calculation: based on knots per string
      const knotConsumption = perString * factor;
      stringLength = (length + knotConsumption + tieOffExtra) * safetyMargin;
    } else if (knots && strings) {
      // Estimate knots per string evenly
      const estimatedPerString = knots / strings;
      const knotConsumption = estimatedPerString * factor;
      stringLength = (length + knotConsumption + tieOffExtra) * safetyMargin;
    } else {
      // Simple estimate: multiply desired length by 3-4x
      stringLength = length * 3.5 + tieOffExtra;
    }

    // Convert if needed
    const multiplier = unit === "inches" ? 2.54 : 1;
    const rawLength = length * multiplier;
    const rawResult = stringLength * (unit === "inches" ? 1 / 2.54 : 1);

    return {
      stringLength: Math.ceil(rawResult),
      unit,
      desiredLength: length,
      details: {
        knotConsumption: knots && perString ? perString * factor : null,
        tieOff: tieOffExtra,
        safetyPercent: 15,
      },
    };
  }, [desiredLength, totalKnots, knotsPerString, numberOfStrings, knotType, unit]);

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
          Calculate how long to cut your strings based on your desired bracelet length and pattern complexity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculator
          </CardTitle>
          <CardDescription>
            Enter your desired bracelet length and pattern details to get a recommended string cut length.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                Desired Bracelet Length *
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">The final length you want your bracelet to be when worn.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
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

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                Knot Type
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">Different knot types consume different amounts of string.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select value={knotType} onValueChange={setKnotType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forward">Forward Knot</SelectItem>
                  <SelectItem value="backward">Backward Knot</SelectItem>
                  <SelectItem value="forward_backward">Forward-Backward</SelectItem>
                  <SelectItem value="backward_forward">Backward-Forward</SelectItem>
                  <SelectItem value="chinese">Chinese Staircase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                Total Knots in Pattern
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">Total number of knots in the full pattern. Found on BraceletBook pattern pages.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="number"
                min="0"
                value={totalKnots}
                onChange={(e) => setTotalKnots(e.target.value)}
                placeholder="e.g., 200"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                Knots Per String
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">How many knots each individual string makes. If unsure, leave blank for an estimate.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="number"
                min="0"
                value={knotsPerString}
                onChange={(e) => setKnotsPerString(e.target.value)}
                placeholder="e.g., 50"
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Strings</Label>
              <Input
                type="number"
                min="1"
                value={numberOfStrings}
                onChange={(e) => setNumberOfStrings(e.target.value)}
                placeholder="e.g., 8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Scissors className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recommended String Length</p>
                <p className="text-4xl font-bold text-primary mt-1">
                  {result.stringLength} {result.unit}
                </p>
                <p className="text-xs text-muted-foreground mt-1">per string</p>
              </div>
              <div className="pt-3 border-t border-primary/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Desired Length</p>
                    <p className="font-medium text-sm">
                      {result.desiredLength} {result.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tie-off Extra</p>
                    <p className="font-medium text-sm">
                      ~{result.details.tieOff} cm
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Safety Margin</p>
                    <p className="font-medium text-sm">+{result.details.safetyPercent}%</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">General rule:</strong> Cut strings 3 to 4 times the desired bracelet length. For complex patterns with many knots, go longer.
          </p>
          <p>
            <strong className="text-foreground">Knot count matters:</strong> Strings that make more knots get used up faster. If one string does most of the knotting (like in a chevron), cut it extra long.
          </p>
          <p>
            <strong className="text-foreground">Better too long than too short:</strong> You can always trim excess, but running out of string mid-bracelet means starting over.
          </p>
          <p>
            <strong className="text-foreground">Track your results:</strong> Log the string lengths you use for each bracelet to build your own reference over time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
