import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Palette } from "lucide-react";
import { useState } from "react";
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
  };

  const openEdit = (thread: any) => {
    setEditId(thread.id);
    setColorName(thread.colorName);
    setColorHex(thread.colorHex);
    setBrand(thread.brand || "");
    setColorCode(thread.colorCode || "");
    setQuantity(thread.quantity?.toString() || "1");
    setNotes(thread.notes || "");
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
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Group threads by brand
  const groupedThreads = threads?.reduce(
    (acc, thread) => {
      const key = thread.brand || "Unbranded";
      if (!acc[key]) acc[key] = [];
      acc[key].push(thread);
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
        <div className="space-y-6">
          {groupedThreads &&
            Object.entries(groupedThreads).map(([brandName, brandThreads]) => (
              <div key={brandName}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{brandName}</h3>
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
                        <div
                          className="w-12 h-12 rounded-full mx-auto border-2 border-white shadow-md mb-2"
                          style={{ backgroundColor: thread.colorHex }}
                        />
                        <p className="text-sm font-medium truncate">{thread.colorName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{thread.colorHex}</p>
                        {thread.colorCode && (
                          <p className="text-xs text-muted-foreground mt-0.5">#{thread.colorCode}</p>
                        )}
                        {thread.quantity != null && thread.quantity > 1 && (
                          <p className="text-xs text-muted-foreground mt-0.5">Qty: {thread.quantity}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Thread" : "Add Thread"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <Label>Hex Code</Label>
              <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} placeholder="#FF0000" className="font-mono" />
            </div>
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
