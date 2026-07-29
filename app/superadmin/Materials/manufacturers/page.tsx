"use client";

// Manufacturer management — CRUD for manufacturers plus their business divisions.

import { useCallback, useEffect, useState } from "react";
import { Building2, Pencil, Plus, Search, Trash2, X } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { countProductsBy, manufacturersApi } from "@/app/lib/catalog/api";
import type { Manufacturer } from "@/app/lib/catalog/types";

interface Row extends Manufacturer {
  productCount: number;
}

export default function ManufacturersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add/edit dialog
  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleting, setDeleting] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await manufacturersApi.list({ search: search || undefined, limit: 500 });
      const [productCounts] = await Promise.all([
        countProductsBy("manufacturerId"),
      ]);
      setRows(
        result.items.map((m) => ({
          ...m,
          productCount: productCounts.get(m.id) ?? 0,
        }))
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manufacturers");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openForm = (m: Manufacturer | null) => {
    setEditing(m);
    setFormName(m?.name ?? "");
    setFormError("");
    setFormOpen(true);
  };

  const submitForm = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: formName,
      };
      if (editing) await manufacturersApi.update(editing.id, payload);
      else await manufacturersApi.create(payload);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };



  const confirmDelete = async () => {
    if (!deleting) return;
    await manufacturersApi.remove(deleting.id);
    setDeleting(null);
    load();
  };

  return (
    <div className="px-7 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search manufacturers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
          />
        </div>
        <Button
          onClick={() => openForm(null)}
          className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white"
        >
          <Plus className="h-4 w-4" /> Add Manufacturer
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-bold text-xs pl-5">Manufacturer</TableHead>
              <TableHead className="font-bold text-xs text-center">Products</TableHead>
              <TableHead className="font-bold text-xs text-center pr-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-sm text-muted-foreground">
                  No manufacturers found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-center">{m.productCount}</TableCell>
                  <TableCell className="pr-5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openForm(m)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                        aria-label={`Edit ${m.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(m)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
                        aria-label={`Delete ${m.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add / edit manufacturer */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? "Edit Manufacturer" : "Add Manufacturer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="rounded-xl border-border"
            />
            {formError && <p className="text-xs text-red-500">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-white"
              onClick={submitForm}
              disabled={saving || !formName.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Delete confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Manufacturer</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleting?.name}</span>?
              {deleting && deleting.productCount > 0 && (
                <> {deleting.productCount} product(s) reference this manufacturer.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
