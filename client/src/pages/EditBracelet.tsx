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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Upload, Loader2, ExternalLink, Sparkles, Info } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const THREAD_TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  glitter: "Glitter",
  metallic: "Metallic",
  glow_in_dark: "Glow in Dark",
  multicolor: "Multicolor",
};

const THREAD_TYPE_ICONS: Record<string, string> = {
  glitter: "✨",
  metallic: "🪙",
  glow_in_dark: "🌙",
  multicolor: "🌈",
};

export default function EditBracelet() {
  const params = useParams<{ id: string }>();
  const braceletId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: bracelet, isLoading: loadingBracelet } = trpc.bracelet.getById.useQuery(
    { id: braceletId },
    { enabled: braceletId > 0 }
  );

  const { data: threads } = trpc.thread.list.useQuery({});

  const [name, setName] = useState("");
  const [status, setStatus] = useState("want_to_make");
  const [patternName, setPatternName] = useState("");
  const [patternNumber, setPatternNumber] = useState("");
  const [patternUrl, setPatternUrl] = useState("");
  const [colors, setColors] = useState<string[]>([]);
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
  const [leftoverStringCm, setLeftoverStringCm] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<{ name: string; type: string } | null>(null);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch pattern data for color limit
  const cleanPatternId = patternNumber.replace(/\D/g, "");
  const { data: patternData } = trpc.pattern.lookup.useQuery(
    { patternId: cleanPatternId },
    { enabled: cleanPatternId.length >= 3 }
  );

  const maxColors = patternData?.strings || null;

  useEffect(() => {
    if (bracelet && !initialized) {
      setName(bracelet.name || "");
      setStatus((bracelet as any).status || "want_to_make");
      setPatternName(bracelet.patternName || "");
      setPatternNumber(bracelet.patternNumber || "");
      setPatternUrl(bracelet.patternUrl || "");
      setColors((bracelet.colors as string[]) || []);
      setMaterials(bracelet.materials || "");
      setDateMade(bracelet.dateMade ? new Date(bracelet.dateMade).toISOString().split("T")[0] : "");
      setTimeTakenMinutes(bracelet.timeTakenMinutes?.toString() || "");
      setDifficulty(bracelet.difficulty || "");
      setNotes(bracelet.notes || "");
      setRating(bracelet.rating?.toString() || "");
      setOutcome(bracelet.outcome || "");
      setFinalLengthCm(bracelet.finalLengthCm?.toString() || "");
      setStringLengthCm(bracelet.stringLengthCm?.toString() || "");
      setNumberOfStrings(bracelet.numberOfStrings?.toString() || "");
      setLeftoverStringCm((bracelet as any).leftoverStringCm?.toString() || "");
      if (bracelet.photoUrl) {
        setPhotoPreview(bracelet.photoUrl);
      }
      setInitialized(true);
    }
  }, [bracelet, initialized]);

  const updateMutation = trpc.bracelet.update.useMutation({
    onSuccess: () => {
      utils.bracelet.list.invalidate();
      utils.bracelet.getById.invalidate({ id: braceletId });
      utils.bracelet.stats.invalidate();
      toast.success("Bracelet updated!");
      setLocation("/");
    },
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  const uploadPhotoMutation = trpc.bracelet.uploadPhoto.useMutation({
    onSuccess: () => {
      utils.bracelet.list.invalidate();
      utils.bracelet.getById.invalidate({ id: braceletId });
    },
  });

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

  const addColor = (hex: string) => {
    if (maxColors && colors.length >= maxColors) {
      toast.error(`This pattern only uses ${maxColors} strings — you've selected the maximum colors.`);
      return;
    }
    if (!colors.includes(hex)) setColors([...colors, hex]);
  };

  const removeColor = (hex: string) => {
    setColors(colors.filter((c) => c !== hex));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a bracelet name");
      return;
    }

    let url = patternUrl;
    if (patternNumber && !patternUrl) {
      url = `https://www.braceletbook.com/patterns/normal/${cleanPatternId}/`;
    }

    if (photoBase64) {
      try {
        await uploadPhotoMutation.mutateAsync({
          braceletId,
          base64: photoBase64,
          mimeType: photoFile?.type || "image/jpeg",
          fileName: photoFile?.name || "photo.jpg",
        });
      } catch {
        toast.error("Photo upload failed");
      }
    }

    updateMutation.mutate({
      id: braceletId,
      name: name.trim(),
      status: status as any,
      patternName: patternName || null,
      patternNumber: cleanPatternId || null,
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
      leftoverStringCm: leftoverStringCm ? parseFloat(leftoverStringCm) : null,
    });
  };

  // Group threads by type
  const threadsByType = useMemo(() => {
    if (!threads) return {};
    const groups: Record<string, typeof threads> = {};
    for (const t of threads) {
      const type = (t as any).threadType || "regular";
      if (!groups[type]) groups[type] = [];
      groups[type].push(t);
    }
    return groups;
  }, [threads]);

  if (loadingBracelet) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bracelet) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Bracelet not found</p>
        <Button variant="link" onClick={() => setLocation("/")}>Go back</Button>
      </div>
    );
  }

  const isSubmitting = updateMutation.isPending || uploadPhotoMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Edit Bracelet
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Bracelet Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want_to_make">Want to Make</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="frogged">Frogged</SelectItem>
                    <SelectItem value="gifted">Gifted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BraceletBook Pattern #</Label>
                <Input value={patternNumber} onChange={(e) => setPatternNumber(e.target.value)} placeholder="e.g., 207002" />
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
                <Label>Pattern Name</Label>
                <Input value={patternName} onChange={(e) => setPatternName(e.target.value)} />
              </div>
            </div>
            {/* Pattern Preview */}
            {patternData && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Pattern Preview</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{patternData.strings} strings</span>
                    <span>{patternData.rows} rows</span>
                    <span>{patternData.colors} colors</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 overflow-x-auto">
                  <img src={patternData.previewImageUrl} alt="Preview" className="h-10 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <img src={patternData.patternImageUrl} alt="Pattern" className="h-24 w-auto object-contain opacity-80" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Pattern URL</Label>
              <Input value={patternUrl} onChange={(e) => setPatternUrl(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Colors from Thread Library */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Colors
              {maxColors && (
                <Badge variant="outline" className="text-xs font-normal">
                  {colors.length}/{maxColors} strings
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Select colors from your thread library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {colors.map((color, i) => {
                  const thread = threads?.find((t) => t.colorHex === color);
                  return (
                    <div key={i} className="flex items-center gap-1.5 bg-secondary rounded-full pl-1 pr-2 py-1">
                      <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                      <span className="text-xs">{thread ? thread.colorName : color}</span>
                      {thread && (thread as any).threadType !== "regular" && (
                        <span className="text-xs">{THREAD_TYPE_ICONS[(thread as any).threadType] || ""}</span>
                      )}
                      <button type="button" onClick={() => removeColor(color)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {threads && threads.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(threadsByType).map(([type, typeThreads]) => (
                  <div key={type}>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      {THREAD_TYPE_ICONS[type] || ""} {THREAD_TYPE_LABELS[type] || type}
                      <span className="opacity-60">({typeThreads.length})</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {typeThreads.map((thread) => {
                        const isSelected = colors.includes(thread.colorHex);
                        const isDisabled = !isSelected && maxColors !== null && colors.length >= maxColors;
                        return (
                          <Tooltip key={thread.id}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => isSelected ? removeColor(thread.colorHex) : addColor(thread.colorHex)}
                                disabled={isDisabled}
                                className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                                  isSelected
                                    ? "border-primary ring-2 ring-primary/30 scale-110"
                                    : isDisabled
                                      ? "border-muted opacity-40 cursor-not-allowed"
                                      : "border-white shadow-sm hover:scale-110"
                                }`}
                                style={{ backgroundColor: thread.colorHex }}
                              >
                                {type === "glitter" && (
                                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
                                )}
                                {type === "multicolor" && (
                                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                                    {((thread as any).secondaryColors || []).slice(0, 3).map((sc: string, idx: number) => (
                                      <div key={idx} className="w-1.5 h-1.5 rounded-full border border-white" style={{ backgroundColor: sc }} />
                                    ))}
                                  </div>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{thread.colorName}</p>
                              {thread.brand && <p className="text-xs opacity-70">{thread.brand} {thread.colorCode || ""}</p>}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">No threads in your library yet.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setLocation("/threads")}>
                  <Plus className="h-3 w-3 mr-1" /> Add Threads
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Materials</Label>
                <Input value={materials} onChange={(e) => setMaterials(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date Made</Label>
                <Input type="date" value={dateMade} onChange={(e) => setDateMade(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Time (minutes)</Label>
                <Input type="number" min="0" value={timeTakenMinutes} onChange={(e) => setTimeTakenMinutes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="How did it turn out?" /></SelectTrigger>
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
            <CardTitle className="text-base flex items-center gap-2">
              Measurements
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Recording your measurements helps the String Calculator learn and give better estimates for future bracelets with the same pattern.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>String Cut Length (cm)</Label>
                <Input type="number" step="0.1" min="0" value={stringLengthCm} onChange={(e) => setStringLengthCm(e.target.value)} placeholder="How long you cut each string" />
              </div>
              <div className="space-y-2">
                <Label>Final Bracelet Length (cm)</Label>
                <Input type="number" step="0.1" min="0" value={finalLengthCm} onChange={(e) => setFinalLengthCm(e.target.value)} placeholder="Finished bracelet length" />
              </div>
              <div className="space-y-2">
                <Label>Number of Strings</Label>
                <Input type="number" min="0" value={numberOfStrings} onChange={(e) => setNumberOfStrings(e.target.value)} placeholder="Auto-fills from pattern" />
              </div>
              <div className="space-y-2">
                <Label>Leftover String (cm)</Label>
                <Input type="number" step="0.1" min="0" value={leftoverStringCm} onChange={(e) => setLeftoverStringCm(e.target.value)} placeholder="How much was left over" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Photo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
                <Button type="button" size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => { setPhotoPreview(null); setPhotoBase64(null); setPhotoFile(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload a photo (max 5MB)</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="Any adjustments, tips, or thoughts about this bracelet..." />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setLocation("/")}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Update Bracelet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
