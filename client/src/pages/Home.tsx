import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Clock,
  Star,
  ExternalLink,
  Trash2,
  Edit,
  Filter,
  X,
  Gem,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
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

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 border-green-200",
  easy: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  hard: "bg-orange-100 text-orange-700 border-orange-200",
  expert: "bg-red-100 text-red-700 border-red-200",
};

const outcomeLabels: Record<string, string> = {
  perfect: "Perfect",
  good: "Good",
  okay: "Okay",
  needs_improvement: "Needs Work",
  failed: "Failed",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  want_to_make: { label: "Want to Make", color: "bg-purple-100 text-purple-700 border-purple-200" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200" },
  frogged: { label: "Frogged", color: "bg-orange-100 text-orange-700 border-orange-200" },
  gifted: { label: "Gifted", color: "bg-pink-100 text-pink-700 border-pink-200" },
};

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "want_to_make", label: "Want to Make" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "frogged", label: "Frogged" },
  { value: "gifted", label: "Gifted" },
];

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      difficulty: difficulty || undefined,
      outcome: outcome || undefined,
      status: status || undefined,
      sortBy,
      sortOrder,
    }),
    [search, difficulty, outcome, status, sortBy, sortOrder]
  );

  const { data: bracelets, isLoading } = trpc.bracelet.list.useQuery(filters);
  const utils = trpc.useUtils();
  const deleteMutation = trpc.bracelet.delete.useMutation({
    onSuccess: () => {
      utils.bracelet.list.invalidate();
      utils.bracelet.stats.invalidate();
      toast.success("Bracelet deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete bracelet"),
  });

  // Quick status update mutation
  const updateMutation = trpc.bracelet.update.useMutation({
    onSuccess: () => {
      utils.bracelet.list.invalidate();
      utils.bracelet.stats.invalidate();
    },
  });

  const hasActiveFilters = difficulty || outcome;

  const clearFilters = () => {
    setDifficulty("");
    setOutcome("");
  };

  // Count bracelets per status from the full (unfiltered by status) list
  const { data: allBracelets } = trpc.bracelet.list.useQuery({});
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (allBracelets) {
      for (const b of allBracelets) {
        const s = (b as any).status || "want_to_make";
        counts[s] = (counts[s] || 0) + 1;
      }
    }
    return counts;
  }, [allBracelets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            My Bracelets
          </h1>
          <p className="text-muted-foreground mt-1">
            {bracelets?.length ?? 0} bracelet{(bracelets?.length ?? 0) !== 1 ? "s" : ""} in your collection
          </p>
        </div>
        <Button onClick={() => setLocation("/add")} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Bracelet
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab.value ? (statusCounts[tab.value] || 0) : (allBracelets?.length || 0);
          return (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                status === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bracelets, patterns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>

        {showFilters && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Any" />
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Outcome</label>
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perfect">Perfect</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="okay">Okay</SelectItem>
                      <SelectItem value="needs_improvement">Needs Work</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Date Added</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="dateMade">Date Made</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="difficulty">Difficulty</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Order</label>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest</SelectItem>
                      <SelectItem value="asc">Oldest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-3 w-3" /> Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bracelet Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="h-40 bg-muted" />
              <CardContent className="pt-4 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-6 w-6 bg-muted rounded-full" />
                  <div className="h-6 w-6 bg-muted rounded-full" />
                  <div className="h-6 w-6 bg-muted rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bracelets && bracelets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bracelets.map((bracelet) => {
            const statusInfo = STATUS_CONFIG[(bracelet as any).status || "want_to_make"] || STATUS_CONFIG.want_to_make;
            return (
              <Card
                key={bracelet.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => setLocation(`/bracelet/${bracelet.id}`)}
              >
                {/* Photo / Pattern Preview */}
                <div className="h-40 bg-gradient-to-br from-primary/5 to-primary/10 relative overflow-hidden">
                  {bracelet.photoUrl ? (
                    <img
                      src={bracelet.photoUrl}
                      alt={bracelet.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : bracelet.patternNumber ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                      <img
                        src={`https://media.braceletbookcdn.com/patterns/000/000/${bracelet.patternNumber.padStart(12, '0').slice(6,9)}/${bracelet.patternNumber.padStart(12, '0').slice(9,12)}/${bracelet.patternNumber.padStart(12, '0')}/preview.png`}
                        alt={`Pattern #${bracelet.patternNumber}`}
                        className="h-10 w-auto max-w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <img
                        src={`https://media.braceletbookcdn.com/patterns/000/000/${bracelet.patternNumber.padStart(12, '0').slice(6,9)}/${bracelet.patternNumber.padStart(12, '0').slice(9,12)}/${bracelet.patternNumber.padStart(12, '0')}/pattern.png`}
                        alt={`Pattern #${bracelet.patternNumber} diagram`}
                        className="h-20 w-auto max-w-full object-contain opacity-80"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gem className="h-12 w-12 text-primary/20" />
                    </div>
                  )}
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${statusInfo.color} backdrop-blur-sm`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/edit/${bracelet.id}`);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 shadow-sm text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(bracelet.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <CardContent className="pt-4 space-y-3">
                  {/* Name and pattern */}
                  <div>
                    <h3 className="font-semibold text-base truncate">{bracelet.name}</h3>
                    {bracelet.patternNumber && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Pattern #{bracelet.patternNumber}
                        </span>
                        {bracelet.patternUrl && (
                          <a
                            href={bracelet.patternUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Color swatches */}
                  {bracelet.colors && (bracelet.colors as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(bracelet.colors as string[]).slice(0, 8).map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {(bracelet.colors as string[]).length > 8 && (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                          +{(bracelet.colors as string[]).length - 8}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {bracelet.difficulty && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 ${difficultyColors[bracelet.difficulty] || ""}`}
                      >
                        {bracelet.difficulty}
                      </Badge>
                    )}
                    {bracelet.timeTakenMinutes != null && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {bracelet.timeTakenMinutes >= 60
                          ? `${Math.floor(bracelet.timeTakenMinutes / 60)}h ${bracelet.timeTakenMinutes % 60}m`
                          : `${bracelet.timeTakenMinutes}m`}
                      </span>
                    )}
                    {bracelet.rating != null && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {bracelet.rating}/5
                      </span>
                    )}
                    {bracelet.outcome && (
                      <span className="text-xs text-muted-foreground">
                        {outcomeLabels[bracelet.outcome] || bracelet.outcome}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Gem className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {status ? `No ${STATUS_CONFIG[status]?.label.toLowerCase()} bracelets` : "No bracelets yet"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm">
              {status
                ? "Try a different status tab or add a new bracelet."
                : "Start tracking your bracelet-making journey by adding your first project."}
            </p>
            <Button onClick={() => setLocation("/add")} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Bracelet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bracelet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this bracelet entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
