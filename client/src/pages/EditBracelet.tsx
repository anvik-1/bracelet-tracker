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
import { ArrowLeft, Plus, X, Upload, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#FF0000", "#FF4500", "#FF8C00", "#FFD700", "#FFFF00",
  "#9ACD32", "#32CD32", "#008000", "#20B2AA", "#00CED1",
  "#1E90FF", "#0000FF", "#4B0082", "#8B008B", "#FF1493",
  "#FF69B4", "#FFFFFF", "#C0C0C0", "#808080", "#000000",
  "#8B4513", "#D2691E", "#F4A460", "#DEB887",
];

export default function EditBracelet() {
  const params = useParams<{ id: string }>();
  const braceletId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: bracelet, isLoading: loadingBracelet } = trpc.bracelet.getById.useQuery(
    { id: braceletId },
    { enabled: braceletId > 0 }
  );

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
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bracelet && !initialized) {
      setName(bracelet.name || "");
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

  const addColor = (color: string) => {
    if (!colors.includes(color)) setColors([...colors, color]);
  };

  const removeColor = (color: string) => {
    setColors(colors.filter((c) => c !== color));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a bracelet name");
      return;
    }

    let url = patternUrl;
    if (patternNumber && !patternUrl) {
      url = `https://www.braceletbook.com/pattern/${patternNumber}/`;
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
            <div className="space-y-2">
              <Label htmlFor="name">Bracelet Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BraceletBook Pattern #</Label>
                <Input value={patternNumber} onChange={(e) => setPatternNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pattern Name</Label>
                <Input value={patternName} onChange={(e) => setPatternName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pattern URL</Label>
              <Input value={patternUrl} onChange={(e) => setPatternUrl(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader><CardTitle className="text-base">Colors</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {colors.map((color, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-secondary rounded-full pl-1 pr-2 py-1">
                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                    <span className="text-xs font-mono">{color}</span>
                    <button type="button" onClick={() => removeColor(color)} className="text-muted-foreground hover:text-foreground">
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
                    key={color} type="button" onClick={() => addColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${colors.includes(color) ? "border-primary ring-2 ring-primary/30 scale-110" : "border-white shadow-sm"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Custom Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
                  <Input value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="w-24 font-mono text-sm" />
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
          <CardHeader><CardTitle className="text-base">Measurements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Final Length (cm)</Label>
                <Input type="number" step="0.1" min="0" value={finalLengthCm} onChange={(e) => setFinalLengthCm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>String Length (cm)</Label>
                <Input type="number" step="0.1" min="0" value={stringLengthCm} onChange={(e) => setStringLengthCm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Number of Strings</Label>
                <Input type="number" min="0" value={numberOfStrings} onChange={(e) => setNumberOfStrings(e.target.value)} />
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
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Update Bracelet"}</Button>
        </div>
      </form>
    </div>
  );
}
