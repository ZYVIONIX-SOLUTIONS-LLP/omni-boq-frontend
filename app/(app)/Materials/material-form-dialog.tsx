"use client";

import { useEffect, useState } from "react";

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
  categoryLabel,
  createMaterial,
  Material,
  MATERIAL_CATEGORIES,
  MaterialCategory,
  MaterialPayload,
  UNITS,
  UnitOfMeasure,
  updateMaterial,
} from "@/app/lib/api/materials";

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this material instead of creating a new one. */
  material?: Material | null;
  onSaved: () => void;
}

interface FormState {
  category: MaterialCategory;
  code: string;
  name: string;
  brand: string;
  series: string;
  insulationType: string;
  sizeSqmm: string;
  coreCount: string;
  conductorMaterial: string;
  conductorConstruction: string;
  currentRatingAmps: string;
  voltageGrade: string;
  standard: string;
  color: string;
  unit: UnitOfMeasure;
  unitPrice: string;
  hsnCode: string;
  gstRate: string;
}

const EMPTY_FORM: FormState = {
  category: "WIRE",
  code: "",
  name: "",
  brand: "",
  series: "",
  insulationType: "",
  sizeSqmm: "",
  coreCount: "",
  conductorMaterial: "",
  conductorConstruction: "",
  currentRatingAmps: "",
  voltageGrade: "",
  standard: "",
  color: "",
  unit: "MTR",
  unitPrice: "",
  hsnCode: "",
  gstRate: "",
};

function materialToForm(material: Material): FormState {
  return {
    category: material.category,
    code: material.code ?? "",
    name: material.name ?? "",
    brand: material.brand ?? "",
    series: material.series ?? "",
    insulationType: material.insulationType ?? "",
    sizeSqmm: material.sizeSqmm != null ? String(material.sizeSqmm) : "",
    coreCount: material.coreCount != null ? String(material.coreCount) : "",
    conductorMaterial: material.conductorMaterial ?? "",
    conductorConstruction: material.conductorConstruction ?? "",
    currentRatingAmps:
      material.currentRatingAmps != null ? String(material.currentRatingAmps) : "",
    voltageGrade: material.voltageGrade ?? "",
    standard: material.standard ?? "",
    color: material.color ?? "",
    unit: material.unit,
    unitPrice: material.unitPrice != null ? String(material.unitPrice) : "",
    hsnCode: material.hsnCode ?? "",
    gstRate: material.gstRate != null ? String(material.gstRate) : "",
  };
}

function formToPayload(form: FormState): MaterialPayload {
  // undefined values are dropped by JSON.stringify, so empty optionals never reach the API
  const str = (value: string) => (value.trim() ? value.trim() : undefined);
  const num = (value: string) =>
    value.trim() && !Number.isNaN(Number(value)) ? Number(value) : undefined;

  return {
    category: form.category,
    code: form.code.trim(),
    name: form.name.trim(),
    unit: form.unit,
    brand: str(form.brand),
    series: str(form.series),
    insulationType: str(form.insulationType),
    sizeSqmm: num(form.sizeSqmm),
    coreCount: num(form.coreCount),
    conductorMaterial: str(form.conductorMaterial),
    conductorConstruction: str(form.conductorConstruction),
    currentRatingAmps: num(form.currentRatingAmps),
    voltageGrade: str(form.voltageGrade),
    standard: str(form.standard),
    color: str(form.color),
    unitPrice: num(form.unitPrice),
    hsnCode: str(form.hsnCode),
    gstRate: num(form.gstRate),
  };
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function MaterialFormDialog({
  open,
  onOpenChange,
  material,
  onSaved,
}: MaterialFormDialogProps) {
  const isEdit = Boolean(material);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(material ? materialToForm(material) : EMPTY_FORM);
      setError("");
    }
  }, [open, material]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputProps = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key)(e.target.value),
    className: "rounded-xl border-border h-9",
  });

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and Name are required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = formToPayload(form);
      if (isEdit && material) {
        await updateMaterial(material.id, payload);
      } else {
        await createMaterial(payload);
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? "Edit Material" : "Add Material"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? `Update details for ${material?.code}`
              : "Create a new material in the catalog"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Basic details ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Category" required>
              <Select
                value={form.category}
                onValueChange={(v) => v && set("category")(v)}
              >
                <SelectTrigger className="rounded-xl border-border h-9 w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {MATERIAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Code" required>
              <Input placeholder="e.g. PLB-FRLSH-1.5" {...inputProps("code")} />
            </Field>
            <Field label="Unit" required>
              <Select value={form.unit} onValueChange={(v) => v && set("unit")(v)}>
                <SelectTrigger className="rounded-xl border-border h-9 w-full">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="col-span-2 md:col-span-3">
              <Field label="Name" required>
                <Input
                  placeholder="e.g. Polycab FRLS-H Single Core Wire 1.5 sq.mm"
                  {...inputProps("name")}
                />
              </Field>
            </div>
            <Field label="Brand">
              <Input placeholder="e.g. Polycab" {...inputProps("brand")} />
            </Field>
            <Field label="Series">
              <Input placeholder="e.g. FRLS-H" {...inputProps("series")} />
            </Field>
            <Field label="Color">
              <Input placeholder="e.g. Red" {...inputProps("color")} />
            </Field>
          </div>

          {/* ── Ratings & standards ── */}
          <div>
            <p className="text-xs font-bold text-foreground mb-2">
              Ratings &amp; Standards
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Current Rating (A)">
                <Input type="number" placeholder="e.g. 17" {...inputProps("currentRatingAmps")} />
              </Field>
              <Field label="Voltage Grade">
                <Input placeholder="e.g. 1100V" {...inputProps("voltageGrade")} />
              </Field>
              <Field label="Standard">
                <Input placeholder="e.g. IS 694:2010" {...inputProps("standard")} />
              </Field>
            </div>
          </div>

          {/* ── Wire attributes (WIRE only) ── */}
          {form.category === "WIRE" && (
            <div>
              <p className="text-xs font-bold text-foreground mb-2">Wire Attributes</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Size (sq.mm)">
                  <Input type="number" placeholder="e.g. 1.5" {...inputProps("sizeSqmm")} />
                </Field>
                <Field label="Core Count">
                  <Input type="number" placeholder="e.g. 1" {...inputProps("coreCount")} />
                </Field>
                <Field label="Insulation Type">
                  <Input placeholder="e.g. FRLS-H" {...inputProps("insulationType")} />
                </Field>
                <Field label="Conductor Material">
                  <Input
                    placeholder="e.g. Electrolytic Copper"
                    {...inputProps("conductorMaterial")}
                  />
                </Field>
                <Field label="Conductor Construction">
                  <Input placeholder="e.g. 30/0.25" {...inputProps("conductorConstruction")} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Pricing ── */}
          <div>
            <p className="text-xs font-bold text-foreground mb-2">Pricing</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label={`Unit Price (₹ / ${form.unit})`}>
                <Input type="number" placeholder="e.g. 59.45" {...inputProps("unitPrice")} />
              </Field>
              <Field label="HSN Code">
                <Input placeholder="e.g. 8544" {...inputProps("hsnCode")} />
              </Field>
              <Field label="GST Rate (%)">
                <Input type="number" placeholder="e.g. 18" {...inputProps("gstRate")} />
              </Field>
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
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Material"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
