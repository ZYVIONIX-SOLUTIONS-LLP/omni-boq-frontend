"use client";

// Category taxonomy — master/detail: categories on the left, the selected
// category's SPECIFICATIONS on the right. A spec is either a "Value" field
// (user types the value when adding a product — e.g. Ampere Rating) or a
// "Yes / No" checkbox (ticked only when it applies — e.g. 1 Way, Indicator,
// 1MD). These specs appear automatically in the Add Product wizard.

import { useCallback, useEffect, useState } from "react";
import { CheckSquare, FolderTree, Pencil, Plus, Search, Trash2, Type } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { attributeDefsApi, categoriesApi, countProductsBy } from "@/app/lib/catalog/api";
import type { AttributeDef, CatalogCategory } from "@/app/lib/catalog/types";

const SPEC_TYPE_LABELS = { text: "Value", boolean: "Yes / No" } as const;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [specs, setSpecs] = useState<AttributeDef[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [productCounts, setProductCounts] = useState<Map<string, number>>(new Map());
  const [specCounts, setSpecCounts] = useState<Map<string, number>>(new Map());

  // Category dialog
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CatalogCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catHsn, setCatHsn] = useState("");
  const [catError, setCatError] = useState("");

  // Spec add form
  const [newSpecName, setNewSpecName] = useState("");
  const [newSpecType, setNewSpecType] = useState<"text" | "boolean">("text");
  const [newSpecUnit, setNewSpecUnit] = useState("");
  const [specError, setSpecError] = useState("");

  const [deletingCat, setDeletingCat] = useState<CatalogCategory | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<AttributeDef | null>(null);

  const load = useCallback(async () => {
    const result = await categoriesApi.list({ search: search || undefined, limit: 500 });
    setCategories(result.items);
    setProductCounts(await countProductsBy("categoryId"));
    const allSpecs = (await attributeDefsApi.all()).filter((a) => a.isActive);
    const counts = new Map<string, number>();
    for (const a of allSpecs) counts.set(a.categoryId, (counts.get(a.categoryId) ?? 0) + 1);
    setSpecCounts(counts);
    setSelectedId((prev) =>
      result.items.some((c) => c.id === prev) ? prev : result.items[0]?.id ?? ""
    );
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const loadSpecs = useCallback(async () => {
    if (!selectedId) {
      setSpecs([]);
      return;
    }
    const result = await attributeDefsApi.list({
      filter: { categoryId: selectedId } as Partial<AttributeDef>,
      limit: 500,
    });
    setSpecs([...result.items].sort((a, b) => a.sortOrder - b.sortOrder));
  }, [selectedId]);

  useEffect(() => {
    loadSpecs();
  }, [loadSpecs]);

  const selected = categories.find((c) => c.id === selectedId) ?? null;

  const openCatForm = (c: CatalogCategory | null) => {
    setEditingCat(c);
    setCatName(c?.name ?? "");
    setCatHsn(c?.hsnCode ?? "");
    setCatError("");
    setCatFormOpen(true);
  };

  const submitCat = async () => {
    setCatError("");
    try {
      const payload = { name: catName, hsnCode: catHsn.trim() || null };
      if (editingCat) await categoriesApi.update(editingCat.id, payload);
      else {
        const created = await categoriesApi.create(payload);
        setSelectedId(created.id);
      }
      setCatFormOpen(false);
      load();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const addSpec = async () => {
    if (!selected || !newSpecName.trim()) return;
    setSpecError("");
    try {
      await attributeDefsApi.create({
        name: newSpecName,
        categoryId: selected.id,
        type: newSpecType,
        unit: newSpecType === "text" ? newSpecUnit.trim() || null : null,
        options: [],
        required: false,
        sortOrder: specs.length ? Math.max(...specs.map((s) => s.sortOrder)) + 1 : 0,
      });
      setNewSpecName("");
      setNewSpecUnit("");
      loadSpecs();
      load();
    } catch (err) {
      setSpecError(err instanceof Error ? err.message : "Failed to add specification");
    }
  };

  return (
    <div className="px-7 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search categories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
          />
        </div>
        <Button
          onClick={() => openCatForm(null)}
          className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white"
        >
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,2fr)_3fr] gap-5 items-start">
        {/* Categories */}
        <Card className="rounded-2xl shadow-sm border-border bg-white p-2">
          {categories.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No categories</p>
          ) : (
            <ul className="space-y-0.5">
              {categories.map((c) => (
                <li key={c.id}>
                  {/* div, not button: rows contain the edit/delete buttons and
                      nested <button> elements are invalid HTML */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(c.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(c.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all",
                      c.id === selectedId ? "bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                        c.id === selectedId
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <FolderTree className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm font-semibold truncate",
                          c.id === selectedId && "text-primary"
                        )}
                      >
                        {c.name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {productCounts.get(c.id) ?? 0} products · {specCounts.get(c.id) ?? 0}{" "}
                        specs
                        {c.hsnCode ? ` · HSN ${c.hsnCode}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCatForm(c);
                        }}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingCat(c);
                        }}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Specifications of the selected category */}
        <Card className="rounded-2xl shadow-sm border-border bg-white p-5 space-y-4">
          {selected ? (
            <>
              <div>
                <p className="text-sm font-bold">Specifications — {selected.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  These fields appear in the Add Product wizard when this category is
                  selected. <span className="font-semibold">Value</span> specs are typed in
                  (e.g. Ampere Rating); <span className="font-semibold">Yes / No</span> specs
                  are tick boxes (e.g. 1 Way, Indicator, 1MD).
                </p>
              </div>

              <div className="space-y-1.5">
                {specs.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    No specifications yet — add the fields this category needs below.
                  </p>
                )}
                {specs.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2.5 rounded-xl bg-muted/30 px-3 py-2"
                  >
                    <span className="text-muted-foreground">
                      {s.type === "boolean" ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : (
                        <Type className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <p className="text-sm font-semibold flex-1 min-w-0 truncate">
                      {s.name}
                      {s.unit && (
                        <span className="text-xs text-muted-foreground font-normal">
                          {" "}
                          ({s.unit})
                        </span>
                      )}
                    </p>
                    <Badge
                      className={
                        s.type === "boolean"
                          ? "bg-amber-100 text-amber-700 border-0 rounded-full text-[10px] font-semibold"
                          : "bg-primary/10 text-primary border-0 rounded-full text-[10px] font-semibold"
                      }
                    >
                      {SPEC_TYPE_LABELS[s.type === "boolean" ? "boolean" : "text"]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingSpec(s)}
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500 shrink-0"
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add spec */}
              <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
                <p className="text-xs font-bold">Add Specification</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Name (e.g. Ampere Rating, 1 Way, 1MD)"
                    value={newSpecName}
                    onChange={(e) => setNewSpecName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSpec()}
                    className="rounded-xl border-border h-9 flex-1 min-w-[180px]"
                  />
                  <Select
                    value={newSpecType}
                    items={SPEC_TYPE_LABELS}
                    onValueChange={(v) => v && setNewSpecType(v as "text" | "boolean")}
                  >
                    <SelectTrigger className="rounded-xl border-border h-9 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border">
                      <SelectItem value="text">Value</SelectItem>
                      <SelectItem value="boolean">Yes / No</SelectItem>
                    </SelectContent>
                  </Select>
                  {newSpecType === "text" && (
                    <Input
                      placeholder="Unit"
                      value={newSpecUnit}
                      onChange={(e) => setNewSpecUnit(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSpec()}
                      className="rounded-xl border-border h-9 w-20"
                    />
                  )}
                  <Button
                    size="icon"
                    onClick={addSpec}
                    disabled={!newSpecName.trim()}
                    className="h-9 w-9 rounded-lg bg-primary text-white shrink-0"
                    aria-label="Add specification"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {specError && <p className="text-xs text-red-500">{specError}</p>}
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-10">
              Select a category to manage its specifications
            </p>
          )}
        </Card>
      </div>

      {/* Category add/edit */}
      <Dialog open={catFormOpen} onOpenChange={setCatFormOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingCat ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Category name *"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="rounded-xl border-border"
            />
            <Input
              placeholder="Default HSN code"
              value={catHsn}
              onChange={(e) => setCatHsn(e.target.value)}
              className="rounded-xl border-border"
            />
            {catError && <p className="text-xs text-red-500">{catError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCatFormOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-white"
              onClick={submitCat}
              disabled={!catName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category */}
      <Dialog open={Boolean(deletingCat)} onOpenChange={(open) => !open && setDeletingCat(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Category</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deletingCat?.name}</span>{" "}
              and stop offering its specifications?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeletingCat(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={async () => {
                if (deletingCat) await categoriesApi.remove(deletingCat.id);
                setDeletingCat(null);
                load();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete spec */}
      <Dialog open={Boolean(deletingSpec)} onOpenChange={(open) => !open && setDeletingSpec(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Specification</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deletingSpec?.name}</span>?
              Existing products keep their stored value but it will no longer be asked for.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeletingSpec(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={async () => {
                if (deletingSpec) await attributeDefsApi.remove(deletingSpec.id);
                setDeletingSpec(null);
                loadSpecs();
                load();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
