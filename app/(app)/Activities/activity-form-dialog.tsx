"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  Activity,
  ActivityPayload,
  createActivity,
  PROJECT_SEGMENTS,
  ProjectSegment,
  updateActivity,
  WiringType,
} from "@/app/lib/api/activities";
import {
  categoryLabel,
  MATERIAL_CATEGORIES,
  MaterialCategory,
  UNITS,
  UnitOfMeasure,
} from "@/app/lib/api/materials";

interface RequirementRow {
  category: MaterialCategory;
  description: string;
  unit: UnitOfMeasure;
  quantity: string;
}

const EMPTY_ROW: RequirementRow = {
  category: "WIRE",
  description: "",
  unit: "MTR",
  quantity: "",
};

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wiringType: WiringType;
  activity?: Activity | null;
  onSaved: () => void;
}

export default function ActivityFormDialog({
  open,
  onOpenChange,
  wiringType,
  activity,
  onSaved,
}: ActivityFormDialogProps) {
  const isEdit = Boolean(activity);
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<ProjectSegment>("RESIDENTIAL");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<RequirementRow[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (activity) {
      setName(activity.name);
      setSegment((activity.segment as ProjectSegment) ?? "RESIDENTIAL");
      setDescription(activity.description ?? "");
      setRows(
        activity.requirements.map((req) => ({
          category: req.category,
          description: req.description,
          unit: req.unit as UnitOfMeasure,
          quantity: String(Number(req.quantity)),
        }))
      );
    } else {
      setName("");
      setSegment("RESIDENTIAL");
      setDescription("");
      setRows([{ ...EMPTY_ROW }]);
    }
    setError("");
  }, [open, activity]);

  const updateRow = (index: number, patch: Partial<RequirementRow>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (index: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Activity name is required");
      return;
    }
    const validRows = rows.filter((r) => r.description.trim() && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError("Add at least one material requirement with a quantity");
      return;
    }

    const payload: ActivityPayload = {
      name: name.trim(),
      wiringType,
      segment,
      unit: wiringType === "POINT_WIRING" ? "POINT" : "CIRCUIT",
      description: description.trim() || undefined,
      requirements: validRows.map((r) => ({
        category: r.category,
        description: r.description.trim(),
        unit: r.unit,
        quantity: Number(r.quantity),
      })),
    };

    setSaving(true);
    setError("");
    try {
      if (isEdit && activity) {
        await updateActivity(activity.id, payload);
      } else {
        await createActivity(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? "Edit Activity" : "Add Activity"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {wiringType === "POINT_WIRING" ? "Point Wiring" : "Circuit Wiring"} template —
            materials are generic; brands get chosen during quotation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Activity Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. One light controlled by one 6A switch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border-border h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Segment</label>
              <Select value={segment} onValueChange={(v) => v && setSegment(v as ProjectSegment)}>
                <SelectTrigger className="rounded-xl border-border h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {PROJECT_SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Description</label>
            <Input
              placeholder="Optional note shown to estimators"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl border-border h-9"
            />
          </div>

          {/* ── Requirements editor ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-foreground">
                Materials required for ONE {wiringType === "POINT_WIRING" ? "point" : "circuit"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                className="gap-1 rounded-xl h-8 text-xs"
              >
                <Plus className="h-3 w-3" /> Add Material
              </Button>
            </div>

            <div className="space-y-2">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[130px_minmax(0,1fr)_80px_70px_32px] gap-2 items-center"
                >
                  <Select
                    value={row.category}
                    onValueChange={(v) => v && updateRow(index, { category: v as MaterialCategory })}
                  >
                    <SelectTrigger className="rounded-xl border-border h-9 text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border">
                      {MATERIAL_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder='Generic name, e.g. "FR Copper Wire 1.5 sq.mm"'
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    className="rounded-xl border-border h-9 text-sm"
                  />

                  <Select
                    value={row.unit}
                    onValueChange={(v) => v && updateRow(index, { unit: v as UnitOfMeasure })}
                  >
                    <SelectTrigger className="rounded-xl border-border h-9 text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border">
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => updateRow(index, { quantity: e.target.value })}
                    className="rounded-xl border-border h-9 text-sm"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-primary text-white shadow-md shadow-primary/25"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
