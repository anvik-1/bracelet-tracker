import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, X, Upload, Loader2, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#FF0000", "#FF4500", "#FF8C00", "#FFD700", "#FFFF00",
  "#9ACD32", "#32CD32", "#008000", "#20B2AA", "#00CED1",
  "#1E90FF", "#0000FF", "#4B0082", "#8B008B", "#FF1493",
  "#FF69B4", "#FFFFFF", "#C0C0C0", "#808080", "#000000",
  "#8B4513", "#D2691E", "#F4A460", "#DEB887",
];

export default function AddBracelet() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [patternName, setPatternName] = useState("");
  const [patternNumber, setPatternNumber] = useState("");
  const [patternUrl, setPatternUrl] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState("#FF0000");
  const [materials, setMaterials] = useState("");
  const [dateMade, setDateMade] = useState("");
  const [timeTakenMinutes, setTimeTakenMinutes] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("");
  const [outcome, setOutcome] = useState("");
  const [finalLengthCm, setFinalLengthCm] = useState("");
  const [stringLengthCm, setStringLengthCm] = useState("");
  const [numberOfStrings, setNumberOfStrings] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<{ name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.bracelet.create.useMutation({
    onSuccess: async (bracelet) => {
      if (photoBase64 && bracelet) {
        try {
          await uploadPhotoMutation.mutateAsync({
            braceletId: bracelet.id,
            base64: photoBase64,
            mimeType: photoFile?.type || "image/jpeg",
            fileName: photoFile?.name || "photo.jpg",
          });
        } catch {
          toast.error("Bracelet saved but photo upload failed");
        }
      }
      utils.bracelet.list.invalidate();
      utils.bracelet.stats.invalidate();
      toast.success("Bracelet added!");
      setLocation("/");
    },
    onError: (err) => toast.error(err.message || "Failed to create bracelet"),
  });

  const uploadPhotoMutation = trpc.bracelet.uploadPhoto.useMutation();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setPhotoFile({ name: file.name, type: file.type });
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setPhotoBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const addColor = (color: string) => {
    if (!colors.includes(color)) {
      setColors([...colors, color]);
    }
  };

  const removeColor = (color: string) => {
    setColors(colors.filter((c) => c !== color));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a bracelet name");
      return;
    }

    // Auto-generate BraceletBook URL if pattern number is provided
    let url = patternUrl;
    if (patternNumber && !patternUrl) {
      url = `https://www.braceletbook.com/patterns/normal/${patternNumber}/`;
    }

    createMutation.mutate({
      name: name.trim(),
      patternName: patternName || null,
      patternNumber: patternNumber || null,
      patternUrl: url || null,
      colors,
      materials: materials || null,
      dateMade: dateMade || null,
      timeTakenMinutes: timeTakenMinutes ? parseInt(timeTakenMinutes) : null,
      difficulty: (difficulty as any) || null,
      notes: notes || null,
      rating: rating ? parseInt(rating) : null,
      outcome: (outcome as any) || null,
      finalLengthCm: finalLengthCm ? parseFloat(finalLengthCm) : null,
      stringLengthCm: stringLengthCm ? parseFloat(stringLengthCm) : null,
      numberOfStrings: numberOfStrings ? parseInt(numberOfStrings) : null,
    });
  };

  const isSubmitting = createMutation.isPending || uploadPhotoMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Add Bracelet
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bracelet Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Rainbow Chevron"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patternNumber">BraceletBook Pattern #</Label>
                <Input
                  id="patternNumber"
                  value={patternNumber}
                  onChange={(e) => setPatternNumber(e.target.value)}
                  placeholder="e.g., 207002"
                />
                {patternNumber && (
                  <a
                    href={`https://www.braceletbook.com/patterns/normal/${patternNumber.replace(/\D/g, '')}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View on BraceletBook <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="patternName">Pattern Name</Label>
                <Input
                  id="patternName"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  placeholder="e.g., Chevron"
                />
              </div>
            </div>
            {/* BraceletBook Pattern Preview */}
            {patternNumber && (() => {
              const cleanId = patternNumber.replace(/\D/g, '');
              if (!cleanId) return null;
              const padded = cleanId.padStart(12, '0');
              const aaa = padded.slice(6, 9);
              const bbb = padded.slice(9, 12);
              const base = `https://media.braceletbookcdn.com/patterns/000/000/${aaa}/${bbb}/${padded}`;
              return (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Pattern Preview</p>
                  <div className="flex items-center gap-4 overflow-x-auto">
                    <img
                      src={`${base}/preview.png`}
                      alt="Preview"
                      className="h-10 w-auto object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <img
                      src={`${base}/pattern.png`}
                      alt="Pattern"
                      className="h-24 w-auto object-contain opacity-80"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label htmlFor="patternUrl">Pattern URL (auto-fills from pattern #)</Label>
              <Input
                id="patternUrl"
                value={patternUrl}
                onChange={(e) => setPatternUrl(e.target.value)}
                placeholder="https://www.braceletbook.com/patterns/normal/..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {colors.map((color, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-secondary rounded-full pl-1 pr-2 py-1"
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-mono">{color}</span>
                    <button
                      type="button"
                      onClick={() => removeColor(color)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Click to add colors:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => addColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                      colors.includes(color)
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-white shadow-sm"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Custom Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border"
                  />
                  <Input
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-24 font-mono text-sm"
                  />
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => addColor(customColor)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="materials">Materials</Label>
                <Input
                  id="materials"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="e.g., DMC embroidery floss"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateMade">Date Made</Label>
                <Input
                  id="dateMade"
                  type="date"
                  value={dateMade}
                  onChange={(e) => setDateMade(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeTaken">Time (minutes)</Label>
                <Input
                  id="timeTaken"
                  type="number"
                  min="0"
                  value={timeTakenMinutes}
                  onChange={(e) => setTimeTakenMinutes(e.target.value)}
                  placeholder="e.g., 120"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Star</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger>
                  <SelectValue placeholder="How did it turn out?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perfect">Perfect</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="okay">Okay</SelectItem>
                  <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Measurements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finalLength">Final Length (cm)</Label>
                <Input
                  id="finalLength"
                  type="number"
                  step="0.1"
                  min="0"
                  value={finalLengthCm}
                  onChange={(e) => setFinalLengthCm(e.target.value)}
                  placeholder="e.g., 15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stringLength">String Length (cm)</Label>
                <Input
                  id="stringLength"
                  type="number"
                  step="0.1"
                  min="0"
                  value={stringLengthCm}
                  onChange={(e) => setStringLengthCm(e.target.value)}
                  placeholder="e.g., 80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numStrings">Number of Strings</Label>
                <Input
                  id="numStrings"
                  type="number"
                  min="0"
                  value={numberOfStrings}
                  onChange={(e) => setNumberOfStrings(e.target.value)}
                  placeholder="e.g., 8"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full max-h-64 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoBase64(null);
                    setPhotoFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload a photo (max 5MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any adjustments, tips, or thoughts about this bracelet..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setLocation("/")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? "Saving..." : "Save Bracelet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
