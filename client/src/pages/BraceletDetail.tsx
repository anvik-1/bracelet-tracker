import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  Star,
  Ruler,
  Gem,
  Loader2,
  Calendar,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  easy: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-orange-100 text-orange-700",
  expert: "bg-red-100 text-red-700",
};

const outcomeLabels: Record<string, string> = {
  perfect: "Perfect",
  good: "Good",
  okay: "Okay",
  needs_improvement: "Needs Improvement",
  failed: "Failed",
};

export default function BraceletDetail() {
  const params = useParams<{ id: string }>();
  const braceletId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [showDelete, setShowDelete] = useState(false);
  const utils = trpc.useUtils();

  const { data: bracelet, isLoading } = trpc.bracelet.getById.useQuery(
    { id: braceletId },
    { enabled: braceletId > 0 }
  );

  const deleteMutation = trpc.bracelet.delete.useMutation({
    onSuccess: () => {
      utils.bracelet.list.invalidate();
      utils.bracelet.stats.invalidate();
      toast.success("Bracelet deleted");
      setLocation("/");
    },
  });

  if (isLoading) {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            {bracelet.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation(`/edit/${bracelet.id}`)} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Photo */}
      {bracelet.photoUrl && (
        <Card className="overflow-hidden">
          <img src={bracelet.photoUrl} alt={bracelet.name} className="w-full max-h-96 object-cover" />
        </Card>
      )}

      {/* Pattern Reference */}
      {(bracelet.patternNumber || bracelet.patternName) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pattern Reference</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {bracelet.patternNumber && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pattern #:</span>
                  <span className="font-medium">{bracelet.patternNumber}</span>
                  <a
                    href={bracelet.patternUrl || `https://www.braceletbook.com/patterns/normal/${bracelet.patternNumber}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm"
                  >
                    View on BraceletBook <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {/* Pattern preview from BraceletBook */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="overflow-x-auto">
                    <img
                      src={`https://media.braceletbookcdn.com/patterns/000/000/${bracelet.patternNumber.padStart(12, '0').slice(6,9)}/${bracelet.patternNumber.padStart(12, '0').slice(9,12)}/${bracelet.patternNumber.padStart(12, '0')}/preview.png`}
                      alt={`Pattern #${bracelet.patternNumber} preview`}
                      className="h-12 w-auto max-w-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <img
                      src={`https://media.braceletbookcdn.com/patterns/000/000/${bracelet.patternNumber.padStart(12, '0').slice(6,9)}/${bracelet.patternNumber.padStart(12, '0').slice(9,12)}/${bracelet.patternNumber.padStart(12, '0')}/pattern.png`}
                      alt={`Pattern #${bracelet.patternNumber} diagram`}
                      className="max-h-64 w-auto max-w-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                </div>
              </>
            )}
            {bracelet.patternName && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="font-medium">{bracelet.patternName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Colors */}
      {bracelet.colors && (bracelet.colors as string[]).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Colors Used</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(bracelet.colors as string[]).map((color, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary rounded-full pl-1.5 pr-3 py-1.5">
                  <div className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                  <span className="text-sm font-mono">{color}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {bracelet.difficulty && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Difficulty</span>
                <div>
                  <Badge variant="outline" className={difficultyColors[bracelet.difficulty] || ""}>
                    {bracelet.difficulty}
                  </Badge>
                </div>
              </div>
            )}
            {bracelet.timeTakenMinutes != null && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Time Taken</span>
                <p className="font-medium flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {bracelet.timeTakenMinutes >= 60
                    ? `${Math.floor(bracelet.timeTakenMinutes / 60)}h ${bracelet.timeTakenMinutes % 60}m`
                    : `${bracelet.timeTakenMinutes}m`}
                </p>
              </div>
            )}
            {bracelet.rating != null && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Rating</span>
                <p className="font-medium flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < (bracelet.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
                  ))}
                </p>
              </div>
            )}
            {bracelet.outcome && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Outcome</span>
                <p className="font-medium">{outcomeLabels[bracelet.outcome] || bracelet.outcome}</p>
              </div>
            )}
            {bracelet.materials && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Materials</span>
                <p className="font-medium">{bracelet.materials}</p>
              </div>
            )}
            {bracelet.dateMade && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Date Made</span>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(bracelet.dateMade).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Measurements */}
      {(bracelet.finalLengthCm || bracelet.stringLengthCm || bracelet.numberOfStrings) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Measurements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {bracelet.finalLengthCm != null && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Final Length</span>
                  <p className="font-medium flex items-center gap-1.5">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    {bracelet.finalLengthCm} cm
                  </p>
                </div>
              )}
              {bracelet.stringLengthCm != null && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">String Length</span>
                  <p className="font-medium">{bracelet.stringLengthCm} cm</p>
                </div>
              )}
              {bracelet.numberOfStrings != null && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground"># Strings</span>
                  <p className="font-medium">{bracelet.numberOfStrings}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {bracelet.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{bracelet.notes}</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bracelet?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate({ id: braceletId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
