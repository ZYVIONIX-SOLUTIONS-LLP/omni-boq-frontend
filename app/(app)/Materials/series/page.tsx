"use client";

// Product Series management — series always belong to a manufacturer and
// optionally to one of its business divisions.

import { useCallback, useEffect, useState } from "react";
import { Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  countProductsBy,
  divisionsApi,
  manufacturersApi,
  seriesApi,
} from "@/app/lib/catalog/api";
import type { Division, Manufacturer, ProductSeries } from "@/app/lib/catalog/types";

const ALL = "__all__";
const NONE = "__none__";

interface Row extends ProductSeries {
  manufacturerName: string;
  divisionName: string;
  productCount: number;
}

export default function SeriesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSeries | null>(null);
  const [formName, setFormName] = useState("");
  const [formManufacturerId, setFormManufacturerId] = useState("");
  const [formDivisionId, setFormDivisionId] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Row | null>(null);

  useEffect(() => {
    manufacturersApi.list({ limit: 500 }).then((r) => setManufacturers(r.items));
    divisionsApi.list({ limit: 1000 }).then((r) => setDivisions(r.items));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await seriesApi.list({
      search: search || undefined,
      filter: filterManufacturer
        ? ({ manufacturerId: filterManufacturer } as Partial<ProductSeries>)
        : undefined,
      limit: 500,
    });
    const [allManufacturers, allDivisions, productCounts] = await Promise.all([
      manufacturersApi.all(),
      divisionsApi.all(),
      countProductsBy("seriesId"),
    ]);
    setRows(
      result.items.map((s) => ({
        ...s,
        manufacturerName:
          allManufacturers.find((m) => m.id === s.manufacturerId)?.name ?? "—",
        divisionName: allDivisions.find((d) => d.id === s.divisionId)?.name ?? "—",
        productCount: productCounts.get(s.id) ?? 0,
      }))
    );
    setLoading(false);
  }, [search, filterManufacturer]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openForm = (s: ProductSeries | null) => {
    setEditing(s);
    setFormName(s?.name ?? "");
    setFormManufacturerId(s?.manufacturerId ?? filterManufacturer ?? "");
    setFormDivisionId(s?.divisionId ?? "");
    setFormError("");
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!formManufacturerId) {
      setFormError("Select a manufacturer");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: formName,
        manufacturerId: formManufacturerId,
        divisionId: formDivisionId || null,
      };
      if (editing) await seriesApi.update(editing.id, payload);
      else await seriesApi.create(payload);
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
    await seriesApi.remove(deleting.id);
    setDeleting(null);
    load();
  };

  const formDivisions = divisions.filter((d) => d.manufacturerId === formManufacturerId);

  return (
    <div className="px-7 py-6 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search series"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
          />
        </div>
        <Select
          value={filterManufacturer || ALL}
          items={{
            [ALL]: "All manufacturers",
            ...Object.fromEntries(manufacturers.map((m) => [m.id, m.name])),
          }}
          onValueChange={(v) => setFilterManufacturer(v === ALL ? "" : v ?? "")}
        >
          <SelectTrigger className="rounded-xl border-border bg-white h-10 w-[190px]">
            <SelectValue placeholder="Manufacturer" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border">
            <SelectItem value={ALL}>All manufacturers</SelectItem>
            {manufacturers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => openForm(null)}
          className="ml-auto gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white"
        >
          <Plus className="h-4 w-4" /> Add Series
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-bold text-xs pl-5">Series</TableHead>
              <TableHead className="font-bold text-xs">Manufacturer</TableHead>
              <TableHead className="font-bold text-xs">Division</TableHead>
              <TableHead className="font-bold text-xs text-center">Products</TableHead>
              <TableHead className="font-bold text-xs text-center pr-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                  No series found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.manufacturerName}</TableCell>
                  <TableCell className="text-sm">{s.divisionName}</TableCell>
                  <TableCell className="text-sm text-center">{s.productCount}</TableCell>
                  <TableCell className="pr-5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openForm(s)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                        aria-label={`Edit ${s.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(s)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
                        aria-label={`Delete ${s.name}`}
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

      {/* Add / edit series */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? "Edit Series" : "Add Series"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Series name *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="rounded-xl border-border"
            />
            <Select
              value={formManufacturerId}
              items={Object.fromEntries(manufacturers.map((m) => [m.id, m.name]))}
              onValueChange={(v) => {
                if (!v) return;
                setFormManufacturerId(v);
                setFormDivisionId("");
              }}
            >
              <SelectTrigger className="rounded-xl border-border w-full">
                <SelectValue placeholder="Manufacturer *" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {manufacturers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={formDivisionId || NONE}
              items={{
                [NONE]: "No division",
                ...Object.fromEntries(formDivisions.map((d) => [d.id, d.name])),
              }}
              onValueChange={(v) => setFormDivisionId(v === NONE ? "" : v ?? "")}
              disabled={!formManufacturerId}
            >
              <SelectTrigger className="rounded-xl border-border w-full">
                <SelectValue placeholder="Division (optional)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value={NONE}>No division</SelectItem>
                {formDivisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <DialogTitle className="text-lg font-bold">Delete Series</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleting?.name}</span>?
              {deleting && deleting.productCount > 0 && (
                <> {deleting.productCount} product(s) reference this series.</>
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
