import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Palette, X, Sparkles, Zap } from "lucide-react";
import { useState, useCallback } from "react";
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
import { lookupDmc, searchDmc, type DmcColor } from "@shared/dmc-colors";

const THREAD_TYPES = [
  { value: "regular", label: "Regular", icon: "" },
  { value: "glitter", label: "Glitter", icon: "✨" },
  { value: "metallic", label: "Metallic", icon: "🪙" },
  { value: "glow_in_dark", label: "Glow in Dark", icon: "🌙" },
  { value: "multicolor", label: "Multicolor", icon: "🌈" },
];

const THREAD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  THREAD_TYPES.map((t) => [t.value, t.label])
);
const THREAD_TYPE_ICONS: Record<string, string> = Object.fromEntries(
  THREAD_TYPES.map((t) => [t.value, t.icon])
);

export default function ThreadLibrary() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#FF0000");
  const [brand, setBrand] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [threadType, setThreadType] = useState("regular");
  const [secondaryColors, setSecondaryColors] = useState<string[]>([]);
  const [newSecondaryColor, setNewSecondaryColor] = useState("#0000FF");

  // DMC lookup state
  const [dmcSearch, setDmcSearch] = useState("");
  const [dmcSuggestions, setDmcSuggestions] = useState<Array<{ code: string; name: string; hex: string; threadType?: string; secondaryHexColors?: string[] }>>([]);
  const [showDmcSuggestions, setShowDmcSuggestions] = useState(false);

  const { data: threads, isLoading } = trpc.thread.list.useQuery(
    search ? { search } : undefined
  );
  const utils = trpc.useUtils();

  const createMutation = trpc.thread.create.useMutation({
    onSuccess: () => {
      utils.thread.list.invalidate();
      toast.success("Thread added!");
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.thread.update.useMutation({
    onSuccess: () => {
      utils.thread.list.invalidate();
      toast.success("Thread updated!");
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.thread.delete.useMutation({
    onSuccess: () => {
      utils.thread.list.invalidate();
      toast.success("Thread deleted");
      setDeleteId(null);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setColorName("");
    setColorHex("#FF0000");
    setBrand("");
    setColorCode("");
    setQuantity("1");
    setNotes("");
    setThreadType("regular");
    setSecondaryColors([]);
    setNewSecondaryColor("#0000FF");
    setDmcSearch("");
    setDmcSuggestions([]);
    setShowDmcSuggestions(false);
  };

  const openEdit = (thread: any) => {
    setEditId(thread.id);
    setColorName(thread.colorName);
    setColorHex(thread.colorHex);
    setBrand(thread.brand || "");
    setColorCode(thread.colorCode || "");
    setQuantity(thread.quantity?.toString() || "1");
    setNotes(thread.notes || "");
    setThreadType(thread.threadType || "regular");
    setSecondaryColors(thread.secondaryColors || []);
    setDmcSearch("");
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colorName.trim()) {
      toast.error("Color name is required");
      return;
    }
    const data = {
      colorName: colorName.trim(),
      colorHex,
      brand: brand || null,
      colorCode: colorCode || null,
      quantity: parseInt(quantity) || 1,
      notes: notes || null,
      threadType: threadType as any,
      secondaryColors: threadType === "multicolor" ? secondaryColors : [],
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addSecondaryColor = () => {
    if (!secondaryColors.includes(newSecondaryColor)) {
      setSecondaryColors([...secondaryColors, newSecondaryColor]);
    }
  };

  const removeSecondaryColor = (color: string) => {
    setSecondaryColors(secondaryColors.filter((c) => c !== color));
  };

  // DMC auto-fill handler
  const handleDmcSearch = useCallback((query: string) => {
    setDmcSearch(query);
    if (query.trim().length === 0) {
      setDmcSuggestions([]);
      setShowDmcSuggestions(false);
      return;
    }

    // Try exact match first
    const exact = lookupDmc(query.trim());
    if (exact) {
      setDmcSuggestions([{ code: query.trim(), ...exact }]);
      setShowDmcSuggestions(true);
      return;
    }

    // Otherwise search
    const results = searchDmc(query.trim());
    setDmcSuggestions(results);
    setShowDmcSuggestions(results.length > 0);
  }, []);

  const applyDmcColor = (result: { code: string; name: string; hex: string; threadType?: string; secondaryHexColors?: string[] }) => {
    setColorName(result.name);
    setColorHex(result.hex);
    setBrand("DMC");
    setColorCode(result.code);
    setDmcSearch(result.code);
    setShowDmcSuggestions(false);

    // Auto-set thread type from DMC data
    if (result.threadType) {
      const typeMap: Record<string, string> = {
        metallic: "metallic",
        multicolor: "multicolor",
        glow: "glow_in_dark",
      };
      setThreadType(typeMap[result.threadType] || "regular");
    } else {
      setThreadType("regular");
    }

    // Auto-set secondary colors for multicolor threads
    if (result.secondaryHexColors && result.secondaryHexColors.length > 0) {
      setSecondaryColors(result.secondaryHexColors);
    } else {
      setSecondaryColors([]);
    }

    toast.success(`DMC ${result.code} - ${result.name} applied!`);
  };

  // Group threads by type then brand
  const groupedByType = threads?.reduce(
    (acc, thread) => {
      const type = (thread as any).threadType || "regular";
      if (!acc[type]) acc[type] = [];
      acc[type].push(thread);
      return acc;
    },
    {} as Record<string, typeof threads>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Thread Library
          </h1>
          <p className="text-muted-foreground mt-1">
            {threads?.length ?? 0} thread{(threads?.length ?? 0) !== 1 ? "s" : ""} in your collection
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Thread
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by color, brand, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4 space-y-2">
                <div className="w-12 h-12 rounded-full bg-muted mx-auto" />
                <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : threads && threads.length > 0 ? (
        <div className="space-y-8">
          {groupedByType &&
            Object.entries(groupedByType).map(([type, typeThreads]) => {
              const byBrand = typeThreads?.reduce(
                (acc, t) => {
                  const key = t.brand || "Unbranded";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(t);
                  return acc;
                },
                {} as Record<string, typeof typeThreads>
              );

              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">{THREAD_TYPE_ICONS[type]}</span>
                    <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                      {THREAD_TYPE_LABELS[type] || type}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {typeThreads?.length}
                    </Badge>
                  </div>
                  {byBrand &&
                    Object.entries(byBrand).map(([brandName, brandThreads]) => (
                      <div key={brandName} className="mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2 ml-1">{brandName}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {brandThreads?.map((thread) => (
                            <Card key={thread.id} className="group hover:shadow-md transition-all">
                              <CardContent className="pt-4 pb-3 text-center relative">
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEdit(thread)} className="p-1 rounded hover:bg-accent">
                                    <Edit className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                  <button onClick={() => setDeleteId(thread.id)} className="p-1 rounded hover:bg-accent">
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </button>
                                </div>
                                <div className="relative inline-block mb-2">
                                  <div
                                    className="w-12 h-12 rounded-full border-2 border-white shadow-md"
                                    style={{ backgroundColor: thread.colorHex }}
                                  />
                                  {type === "glitter" && (
                                    <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                                  )}
                                  {type === "multicolor" && (thread as any).secondaryColors?.length > 0 && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                      {((thread as any).secondaryColors as string[]).slice(0, 4).map((sc, idx) => (
                                        <div
                                          key={idx}
                                          className="w-3 h-3 rounded-full border border-white shadow-sm"
                                          style={{ backgroundColor: sc }}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm font-medium truncate">{thread.colorName}</p>
                                <p className="text-xs text-muted-foreground font-mono">{thread.colorHex}</p>
                                {thread.colorCode && (
                                  <p className="text-xs text-muted-foreground mt-0.5">#{thread.colorCode}</p>
                                )}
                                {thread.quantity != null && (
                                  <p className="text-xs text-muted-foreground mt-0.5">Qty: {thread.quantity}</p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Palette className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No threads yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Start building your thread library.</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Your First Thread
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={() => resetForm()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Thread" : "Add Thread"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* DMC Quick Lookup */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold text-primary">DMC Quick Lookup</Label>
              </div>
              <p className="text-xs text-muted-foreground">Enter a DMC color code or name to auto-fill all fields.</p>
              <div className="relative">
                <Input
                  value={dmcSearch}
                  onChange={(e) => handleDmcSearch(e.target.value)}
                  onFocus={() => { if (dmcSuggestions.length > 0) setShowDmcSuggestions(true); }}
                  placeholder="e.g., 321, 310, Red, Coral..."
                  className="font-mono"
                />
                {showDmcSuggestions && dmcSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {dmcSuggestions.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-accent text-left transition-colors"
                        onClick={() => applyDmcColor(s)}
                      >
                        <div
                          className="w-6 h-6 rounded-full border shadow-sm shrink-0"
                          style={{ backgroundColor: s.hex }}
                        />
                        <div className="min-w-0">
                          <span className="text-sm font-mono font-medium">DMC {s.code}</span>
                          <span className="text-xs text-muted-foreground ml-2">{s.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <Label>Color</Label>
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-14 h-14 rounded-lg cursor-pointer border"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Color Name *</Label>
                <Input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="e.g., Crimson Red" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hex Code</Label>
                <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} placeholder="#FF0000" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Thread Type</Label>
                <Select value={threadType} onValueChange={setThreadType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THREAD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Secondary colors for multicolor threads */}
            {threadType === "multicolor" && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                <Label className="text-sm">Secondary Colors</Label>
                <p className="text-xs text-muted-foreground">Add the other colors in this multicolor thread.</p>
                {secondaryColors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {secondaryColors.map((sc, i) => (
                      <div key={i} className="flex items-center gap-1 bg-background rounded-full pl-1 pr-2 py-0.5 border">
                        <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: sc }} />
                        <span className="text-xs font-mono">{sc}</span>
                        <button type="button" onClick={() => removeSecondaryColor(sc)}>
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end mt-2">
                  <input
                    type="color"
                    value={newSecondaryColor}
                    onChange={(e) => setNewSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border"
                  />
                  <Input
                    value={newSecondaryColor}
                    onChange={(e) => setNewSecondaryColor(e.target.value)}
                    className="w-24 font-mono text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addSecondaryColor}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., DMC" />
              </div>
              <div className="space-y-2">
                <Label>Color Code</Label>
                <Input value={colorCode} onChange={(e) => setColorCode(e.target.value)} placeholder="e.g., 321" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editId ? "Update" : "Add Thread"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete thread?</AlertDialogTitle>
            <AlertDialogDescription>This will remove this thread from your library.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
