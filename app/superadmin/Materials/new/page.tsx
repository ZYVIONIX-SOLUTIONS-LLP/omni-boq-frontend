"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  attributeDefsApi,
  categoriesApi,
  getProduct,
  manufacturersApi,
  saveProduct,
  ProductInput,
} from "@/app/lib/catalog/api";
import type {
  AttributeDef,
  AttributeValues,
  CatalogCategory,
  Manufacturer,
  ProductImages,
  ProductStatus,
  VoltageClass,
} from "@/app/lib/catalog/types";
import { getUser } from "@/app/lib/auth-storage";

// ── Form state ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "classification", label: "Classification" },
  { id: "model", label: "Product Detail" },
  { id: "specs", label: "Specifications" },
  { id: "pricing", label: "Pricing" },
  { id: "review", label: "Review" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

/** Ad-hoc name/value spec typed manually in the form, for anything not already
 *  covered by the selected category's specification fields. Stored in
 *  product.attributes under a "custom:" key so no schema change is needed. */
interface CustomSpec {
  key: string;
  name: string;
  value: string;
}
const CUSTOM_PREFIX = "custom:";
let customSpecSeq = 0;

const toNum = (s: string): number | null =>
  s.trim() !== "" && !Number.isNaN(Number(s)) ? Number(s) : null;

const selectClass =
  "flex h-10 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// ── Small building blocks ────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({
  sectionRef,
  title,
  subtitle,
  children,
}: {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div ref={sectionRef} className="scroll-mt-32">
      <Card className="rounded-2xl border-border p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </Card>
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────

function ProductFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [initializing, setInitializing] = useState(Boolean(editId));

  // Reference data
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);

  // Classification
  const [voltageClass, setVoltageClass] = useState<VoltageClass | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [series, setSeries] = useState("");

  // Product detail
  const [modelCode, setModelCode] = useState("");
  const [color, setColor] = useState("");
  const [unit, setUnit] = useState("");
  const [mrp, setMrp] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");

  // Specifications: defId -> raw string value ("true"/"false" for Boolean)
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [customSpecs, setCustomSpecs] = useState<CustomSpec[]>([]);
  // Attributes loaded from an existing product, applied once its category's
  // spec defs have finished loading (see reconciliation effect below).
  const [pendingAttributes, setPendingAttributes] = useState<AttributeValues | null>(null);

  const [images, setImages] = useState<ProductImages>({
    primary: null,
    gallery: [],
    datasheet: null,
    brochure: null,
    manual: null,
  });

  const [isGlobalCopy, setIsGlobalCopy] = useState(false);

  // ── Reference data ──
  useEffect(() => {
    categoriesApi.all().then(setCategories);
    manufacturersApi.all().then(setManufacturers);
  }, []);

  // ── Edit mode: hydrate the form from an existing product ──
  useEffect(() => {
    if (!editId) return;
    getProduct(editId).then((product) => {
      if (!product) {
        setLoadError("Product not found — it may have been deleted.");
        setInitializing(false);
        return;
      }

      const user = getUser();
      const isSuper = user?.roles?.includes("SUPERADMIN");
      const globalCopy = !product.tenantId && !isSuper;
      setIsGlobalCopy(globalCopy);

      setVoltageClass(product.voltageClass ?? "");
      setCategoryId(product.categoryId ?? "");
      setManufacturerId(product.manufacturerId ?? "");
      setSeries(product.series ?? "");

      setModelCode(product.modelCode ?? "");
      setColor(product.color ?? "");
      setUnit(product.unit ?? "");
      setMrp(product.mrp != null ? String(product.mrp) : "");
      setDiscountPercent(product.discountPercent != null ? String(product.discountPercent) : "");
      setStatus(product.status);

      setPendingAttributes(product.attributes);
      setImages(product.images);
      setInitializing(false);
    });
  }, [editId]);

  // ── Load the selected category's specification fields ──
  useEffect(() => {
    if (!categoryId) {
      setAttributeDefs([]);
      return;
    }
    attributeDefsApi
      .list({ filter: { categoryId } as Partial<AttributeDef>, limit: 200 })
      .then((res) => {
        setAttributeDefs(
          res.items.filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
        );
      });
  }, [categoryId]);

  // ── Once an edited product's category defs are loaded, split its stored
  //     attributes into structured spec values vs. ad-hoc custom specs. ──
  useEffect(() => {
    if (pendingAttributes == null) return;
    const nextSpecValues: Record<string, string> = {};
    const customRows: CustomSpec[] = [];
    for (const [key, value] of Object.entries(pendingAttributes)) {
      if (key.startsWith(CUSTOM_PREFIX)) {
        customRows.push({
          key: `c${++customSpecSeq}`,
          name: key.slice(CUSTOM_PREFIX.length),
          value: value != null ? String(value) : "",
        });
      } else if (attributeDefs.some((d) => d.id === key)) {
        nextSpecValues[key] = value != null ? String(value) : "";
      }
    }
    setSpecValues(nextSpecValues);
    setCustomSpecs(customRows);
    setPendingAttributes(null);
  }, [attributeDefs, pendingAttributes]);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const selectedManufacturer = manufacturers.find((m) => m.id === manufacturerId) ?? null;

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    setSpecValues({});
  };

  // ── Auto-generated product name: Manufacturer + Series + Category + specs + Color ──
  const computeName = () => {
    const parts: string[] = [];
    if (selectedManufacturer) parts.push(selectedManufacturer.name);
    if (series.trim()) parts.push(series.trim());
    if (selectedCategory) parts.push(selectedCategory.name);
    for (const def of attributeDefs) {
      const raw = specValues[def.id];
      if (raw === undefined || raw === "") continue;
      if (def.type === "BOOLEAN") {
        if (raw === "true") parts.push(def.name);
      } else if (def.type === "NUMBER") {
        parts.push(def.unit ? `${raw}${def.unit}` : raw);
      } else {
        parts.push(raw);
      }
    }
    for (const row of customSpecs) {
      if (row.name.trim() && row.value.trim()) parts.push(row.value.trim());
    }
    if (color.trim()) parts.push(color.trim());
    return parts.join(" ");
  };

  // ── Section refs ──
  const sectionRefs: Record<SectionId, React.RefObject<HTMLDivElement | null>> = {
    classification: useRef<HTMLDivElement>(null),
    model: useRef<HTMLDivElement>(null),
    specs: useRef<HTMLDivElement>(null),
    pricing: useRef<HTMLDivElement>(null),
    review: useRef<HTMLDivElement>(null),
  };
  const scrollToSection = (id: SectionId) =>
    sectionRefs[id].current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Validation ──
  const validate = (): { section: SectionId; message: string } | null => {
    if (!manufacturerId) return { section: "classification", message: "Manufacturer is required" };
    if (!categoryId) return { section: "classification", message: "Category is required" };
    return null;
  };

  // ── Save ──
  const handleSave = async () => {
    const err = validate();
    if (err) {
      setSaveError(err.message);
      scrollToSection(err.section);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const attributes: AttributeValues = {};
      for (const def of attributeDefs) {
        const raw = specValues[def.id];
        if (raw === undefined || raw === "") continue;
        if (def.type === "NUMBER") {
          const n = Number(raw);
          attributes[def.id] = Number.isFinite(n) ? n : null;
        } else if (def.type === "BOOLEAN") {
          attributes[def.id] = raw === "true";
        } else {
          attributes[def.id] = raw;
        }
      }
      for (const row of customSpecs) {
        if (row.name.trim() && row.value.trim()) {
          attributes[`${CUSTOM_PREFIX}${row.name.trim()}`] = row.value.trim();
        }
      }
      const finalEditId = isGlobalCopy ? undefined : editId;

      const productInput: ProductInput = {
        id: finalEditId ?? undefined,
        manufacturerId: manufacturerId || undefined,
        manufacturerName: selectedManufacturer?.name,
        series: series.trim() || null,
        categoryId: categoryId || undefined,
        categoryName: selectedCategory?.name,
        subCategoryId: undefined,
        subCategoryName: undefined,
        voltageClass: (voltageClass as VoltageClass) || null,
        name: computeName(),
        color: color.trim() || null,
        modelCode: modelCode.trim() || null,
        attributes,
        unit: unit.trim() || null,
        hsnCode: selectedCategory?.hsnCode || null,
        gstRate: selectedCategory?.defaultGstRate ?? null,
        mrp: toNum(mrp),
        discountPercent: toNum(discountPercent),
        images,
        status,
      };

      await saveProduct(productInput);
      router.push("/superadmin/Materials");
    } catch (err2) {
      setSaveError(err2 instanceof Error ? err2.message : "Failed to save product");
      setSaving(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading product...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="px-7 py-10 text-center space-y-4">
        <p className="text-sm text-red-600">{loadError}</p>
        <Button variant="outline" className="rounded-xl" onClick={() => router.push("/superadmin/Materials")}>
          Back to Product Library
        </Button>
      </div>
    );
  }

  const computedName = computeName();
  const specRows = attributeDefs
    .map((def) => {
      const raw = specValues[def.id];
      if (raw === undefined || raw === "") return null;
      const display =
        def.type === "BOOLEAN" ? (raw === "true" ? "Yes" : null) : def.unit ? `${raw} ${def.unit}` : raw;
      return display ? { label: def.name, value: display } : null;
    })
    .filter((r): r is { label: string; value: string } => r !== null)
    .concat(
      customSpecs
        .filter((r) => r.name.trim() && r.value.trim())
        .map((r) => ({ label: r.name.trim(), value: r.value.trim() }))
    );

  const hierarchy = [
    { label: "Manufacturer", value: selectedManufacturer?.name },
    { label: "Series", value: series || undefined },
    { label: "Category", value: selectedCategory?.name },
  ];

  const saveButton = (
    <Button
      onClick={handleSave}
      disabled={saving}
      className="rounded-xl gap-2 font-semibold bg-primary text-white shadow-md shadow-primary/25"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      {saving ? "Saving..." : editId ? "Save Changes" : "Save Product"}
    </Button>
  );

  return (
    <div className="px-7 py-6">
      <div className="sticky top-0 z-10 -mx-7 mb-4 border-b border-border bg-[#f8f7ff]/95 px-7 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{editId ? "Edit Product" : "Add Product"}</h2>
            <p className="text-xs text-muted-foreground">
              Fill in everything below — it&apos;s all on one page, no steps to click through.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => router.push("/superadmin/Materials")}
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
            {saveButton}
          </div>
        </div>

        <nav className="mt-3 flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToSection(s.id)}
              className="whitespace-nowrap rounded-lg px-3 py-1 text-[12px] font-semibold text-muted-foreground transition-all hover:bg-white hover:text-primary"
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {saveError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{saveError}</p>
      )}

      <div className="max-w-4xl space-y-5">
        {/* ── Classification ── */}
        <Section
          sectionRef={sectionRefs.classification}
          title="Classification"
          subtitle="Category and Manufacturer determine which specification fields appear below."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Voltage Class">
              <select
                className={selectClass}
                value={voltageClass}
                onChange={(e) => setVoltageClass(e.target.value as VoltageClass | "")}
              >
                <option value="">Select Voltage Class...</option>
                <option value="LV">LV (Low Voltage)</option>
                <option value="MV">MV (Medium Voltage)</option>
                <option value="HV">HV (High Voltage)</option>
                <option value="EHV">EHV (Extra High Voltage)</option>
              </select>
            </Field>
            <div />
            <Field label="Category" required>
              <select
                className={selectClass}
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manufacturer" required>
              <select
                className={selectClass}
                value={manufacturerId}
                onChange={(e) => setManufacturerId(e.target.value)}
              >
                <option value="">Select Manufacturer...</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Product Series" className="md:col-span-2">
              <Input
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="Optional — e.g. Livia, Myrius, Acti 9..."
                className="rounded-xl border-border h-10"
              />
            </Field>
          </div>
        </Section>

        {/* ── Product Detail ── */}
        <Section sectionRef={sectionRefs.model} title="Product Detail">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Model Code">
              <Input
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                placeholder="e.g. SW-10A-1W"
                className="rounded-xl border-border h-10"
              />
            </Field>
            <Field label="Color">
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Optional — e.g. White"
                className="rounded-xl border-border h-10"
              />
            </Field>
            <Field label="Unit of Measure">
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Nos, Meter, Roll, Box..."
                className="rounded-xl border-border h-10"
              />
            </Field>
            <Field label="HSN Code">
              <Input
                value={selectedCategory?.hsnCode || ""}
                readOnly
                disabled
                className="rounded-xl border-border h-10 bg-muted cursor-not-allowed text-muted-foreground"
              />
            </Field>
          </div>
        </Section>

        {/* ── Specifications ── */}
        <Section
          sectionRef={sectionRefs.specs}
          title="Specifications"
          subtitle={
            selectedCategory
              ? `Fields defined for "${selectedCategory.name}" — add anything else below.`
              : "Select a category above to see its specification fields."
          }
        >
          <div className="space-y-4">
            {attributeDefs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attributeDefs.map((def) => (
                  <Field key={def.id} label={def.unit ? `${def.name} (${def.unit})` : def.name} required={def.required}>
                    {def.type === "BOOLEAN" ? (
                      <label className="flex items-center gap-2 h-10">
                        <input
                          type="checkbox"
                          checked={specValues[def.id] === "true"}
                          onChange={(e) =>
                            setSpecValues((prev) => ({
                              ...prev,
                              [def.id]: e.target.checked ? "true" : "false",
                            }))
                          }
                          className="h-4 w-4 rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">
                          {specValues[def.id] === "true" ? "Yes" : "No"}
                        </span>
                      </label>
                    ) : def.type === "SELECT" ? (
                      <select
                        className={selectClass}
                        value={specValues[def.id] ?? ""}
                        onChange={(e) =>
                          setSpecValues((prev) => ({ ...prev, [def.id]: e.target.value }))
                        }
                      >
                        <option value="">Select...</option>
                        {def.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={def.type === "NUMBER" ? "number" : "text"}
                        value={specValues[def.id] ?? ""}
                        onChange={(e) =>
                          setSpecValues((prev) => ({ ...prev, [def.id]: e.target.value }))
                        }
                        className="rounded-xl border-border h-10"
                      />
                    )}
                  </Field>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
              <p className="text-xs font-bold">Additional Specifications</p>
              {customSpecs.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <Input
                    placeholder="Name (e.g. Finish)"
                    value={row.name}
                    onChange={(e) =>
                      setCustomSpecs((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r))
                      )
                    }
                    className="rounded-xl border-border h-9 w-48"
                  />
                  <Input
                    placeholder="Value (e.g. Matt White)"
                    value={row.value}
                    onChange={(e) =>
                      setCustomSpecs((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, value: e.target.value } : r))
                      )
                    }
                    className="rounded-xl border-border h-9 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCustomSpecs((prev) => prev.filter((r) => r.key !== row.key))}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 shrink-0"
                    aria-label="Remove specification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5"
                onClick={() =>
                  setCustomSpecs((prev) => [...prev, { key: `c${++customSpecSeq}`, name: "", value: "" }])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add Specification
              </Button>
            </div>
          </div>
        </Section>

        {/* ── Pricing ── */}
        <Section
          sectionRef={sectionRefs.pricing}
          title="Pricing"
          subtitle="Prices and discounts for this material."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Field label="MRP (₹)">
              <Input
                type="number"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="e.g. 500"
                className="rounded-xl border-border h-10"
              />
            </Field>
            <Field label="Discount Percent (%)">
              <Input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="e.g. 10"
                className="rounded-xl border-border h-10"
              />
            </Field>
          </div>
        </Section>

        {/* ── Review ── */}
        <Section sectionRef={sectionRefs.review} title="Review">
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold">{computedName || "—"}</p>
              {modelCode && <p className="text-xs text-muted-foreground">{modelCode}</p>}
              <p className="text-xs text-muted-foreground">
                {hierarchy
                  .filter((h) => h.value)
                  .map((h) => h.value)
                  .join(" › ") || "Fill in the classification above"}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
              <p className="text-xs">
                <span className="text-muted-foreground">Unit: </span>
                <span className="font-semibold">{unit || "—"}</span>
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">HSN: </span>
                <span className="font-semibold">{selectedCategory?.hsnCode || "—"}</span>
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">GST (from category): </span>
                <span className="font-semibold">
                  {selectedCategory?.defaultGstRate != null ? `${selectedCategory.defaultGstRate}%` : "—"}
                </span>
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">MRP: </span>
                <span className="font-semibold">{mrp ? `₹${mrp}` : "—"}</span>
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">Discount: </span>
                <span className="font-semibold">{discountPercent ? `${discountPercent}%` : "—"}</span>
              </p>
            </div>
            {specRows.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-1.5">Specifications</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                  {specRows.map((row, i) => (
                    <p key={i} className="text-xs">
                      <span className="text-muted-foreground">{row.label}: </span>
                      <span className="font-semibold">{row.value}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        <div className="flex justify-end pb-8">{saveButton}</div>
      </div>
    </div>
  );
}

export default function ProductFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      }
    >
      <ProductFormInner />
    </Suspense>
  );
}
