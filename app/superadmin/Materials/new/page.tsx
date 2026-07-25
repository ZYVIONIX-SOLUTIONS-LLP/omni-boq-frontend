"use client";

// Add / Edit Product — a single scrollable form covering the full catalog
// hierarchy: Manufacturer → Division → Series → Category → Model
// → Specifications → Variants → Pricing → Review. Everything is visible and
// editable in one viewport; the pill bar just scrolls to a section, it never
// gates access the way a wizard's Next/Back would. With ?id=<productId> the
// form loads an existing product for editing.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchableCombo, { ComboPage } from "@/components/ui/searchable-combo";
import { cn } from "@/lib/utils";
import {
  attributeDefsApi,
  categoriesApi,
  divisionsApi,
  getProduct,
  hsnCodesApi,
  manufacturersApi,
  saveProduct,
  seriesApi,
  taxRatesApi,
  unitsApi,
  ProductInput,
  VariantInput,
} from "@/app/lib/catalog/api";
import type {
  AttributeDef,
  AttributeValues,
  FileMeta,
  PriceSet,
  ProductImages,
  TaxRate,
  VariantStatus,
} from "@/app/lib/catalog/types";
import { PRICE_FIELDS } from "@/app/lib/catalog/types";

// ── Form state ───────────────────────────────────────────────────────────────

interface Picked {
  id: string;
  name: string;
}

interface VariantDraft {
  key: string; // stable UI key
  id?: string; // existing variant id when editing
  name: string;
  modelCode: string;
  manufacturerSku: string;
  internalSku: string;
  barcode: string;
  ean: string;
  status: VariantStatus;
  stockQty: string;
  prices: Record<keyof PriceSet, string>;
  gstRate: string;
  discountPercent: string;
  image: FileMeta | null;
}

const emptyPrices = (): VariantDraft["prices"] => ({
  mrp: "",
  dealer: "",
  distributor: "",
  contractor: "",
  purchase: "",
  offer: "",
});

let variantKeySeq = 0;
const newVariant = (): VariantDraft => ({
  key: `v${++variantKeySeq}`,
  name: "",
  modelCode: "",
  manufacturerSku: "",
  internalSku: "",
  barcode: "",
  ean: "",
  status: "ACTIVE",
  stockQty: "",
  prices: emptyPrices(),
  gstRate: "",
  discountPercent: "",
  image: null,
});

const SECTIONS = [
  { id: "classification", label: "Manufacturer & Classification" },
  { id: "model", label: "Product Model" },
  { id: "specs", label: "Specifications" },
  { id: "variants", label: "Variants" },
  { id: "pricing", label: "Pricing" },
  { id: "review", label: "Review" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

/** Ad-hoc name/value spec typed manually in the form; stored in
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

  // Hierarchy selections
  const [manufacturer, setManufacturer] = useState<Picked | null>(null);
  const [division, setDivision] = useState<Picked | null>(null);
  const [series, setSeries] = useState<Picked | null>(null);
  const [category, setCategory] = useState<Picked | null>(null);

  // Model
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState<Picked | null>(null);
  const [hsn, setHsn] = useState<Picked | null>(null);
  const [gstRate, setGstRate] = useState("");
  const [status, setStatus] = useState<VariantStatus>("ACTIVE");

  // Variants & specifications. Sub-category and images are no longer collected
  // in this form, but existing values are preserved when editing older products.
  const [variants, setVariants] = useState<VariantDraft[]>([newVariant()]);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);
  const [specs, setSpecs] = useState<AttributeValues>({});
  const [customSpecs, setCustomSpecs] = useState<CustomSpec[]>([]);
  const [subCategory, setSubCategory] = useState<Picked | null>(null);
  const [images, setImages] = useState<ProductImages>({
    primary: null,
    gallery: [],
    datasheet: null,
    brochure: null,
    manual: null,
  });

  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);

  useEffect(() => {
    taxRatesApi.list({ limit: 100 }).then((r) => setTaxRates(r.items));
  }, []);

  // The selected category decides which specification fields appear
  useEffect(() => {
    if (!category) {
      setAttributeDefs([]);
      return;
    }
    attributeDefsApi
      .list({ filter: { categoryId: category.id } as Partial<AttributeDef>, limit: 500 })
      .then((r) => setAttributeDefs([...r.items].sort((a, b) => a.sortOrder - b.sortOrder)));
  }, [category]);

  // ── Edit mode: hydrate the form from an existing product ──
  useEffect(() => {
    if (!editId) return;
    getProduct(editId).then((product) => {
      if (!product) {
        setLoadError("Product not found — it may have been deleted.");
        setInitializing(false);
        return;
      }
      setManufacturer(product.manufacturer ?? null);
      setDivision(product.division ?? null);
      setSeries(product.series ?? null);
      setCategory(product.category ?? null);
      setSubCategory(product.subCategory ?? null);
      setName(product.name);
      setDescription(product.description ?? "");
      setUnit(product.unitId ? { id: product.unitId, name: product.unitName ?? "" } : null);
      setHsn(product.hsnCode ? { id: product.hsnCode, name: product.hsnCode } : null);
      setGstRate(product.gstRate != null ? String(product.gstRate) : "");
      setStatus(product.status);
      // Split stored attributes into category specs and manual "custom:" ones
      const defValues: AttributeValues = {};
      const customRows: CustomSpec[] = [];
      for (const [key, value] of Object.entries(product.attributes)) {
        if (key.startsWith(CUSTOM_PREFIX)) {
          customRows.push({
            key: `c${++customSpecSeq}`,
            name: key.slice(CUSTOM_PREFIX.length),
            value: value != null ? String(value) : "",
          });
        } else {
          defValues[key] = value;
        }
      }
      setSpecs(defValues);
      setCustomSpecs(customRows);
      setImages(product.images);
      setVariants(
        product.variants.map((v) => ({
          key: `v${++variantKeySeq}`,
          id: v.id,
          name: v.name,
          modelCode: v.modelCode ?? "",
          manufacturerSku: v.manufacturerSku ?? "",
          internalSku: v.internalSku ?? "",
          barcode: v.barcode ?? "",
          ean: v.ean ?? "",
          status: v.status,
          stockQty: v.stockQty != null ? String(v.stockQty) : "",
          prices: Object.fromEntries(
            PRICE_FIELDS.map((f) => [f.key, v.prices[f.key] != null ? String(v.prices[f.key]) : ""])
          ) as VariantDraft["prices"],
          gstRate: v.gstRate != null ? String(v.gstRate) : "",
          discountPercent: v.discountPercent != null ? String(v.discountPercent) : "",
          image: v.image ?? null,
        }))
      );
      setInitializing(false);
    });
  }, [editId]);

  // ── Combo loaders (paged + searchable) ──
  const comboLoader = useCallback(
    <T extends { id: string; name: string }>(
      api: {
        list: (p: {
          search?: string;
          page?: number;
          limit?: number;
          filter?: Record<string, unknown>;
        }) => Promise<{ items: T[]; meta: { hasNextPage: boolean } }>;
      },
      filter?: Record<string, unknown>,
      hint?: (item: T) => string | undefined
    ) =>
      async (search: string, page: number, pageSize: number): Promise<ComboPage> => {
        const result = await api.list({ search, page, limit: pageSize, filter });
        return {
          items: result.items.map((i) => ({ id: i.id, name: i.name, hint: hint?.(i) })),
          hasMore: result.meta.hasNextPage,
        };
      },
    []
  );

  // ── Section refs (for scroll-to-section nav + jumping to the first error) ──
  const sectionRefs: Record<SectionId, React.RefObject<HTMLDivElement | null>> = {
    classification: useRef<HTMLDivElement>(null),
    model: useRef<HTMLDivElement>(null),
    specs: useRef<HTMLDivElement>(null),
    variants: useRef<HTMLDivElement>(null),
    pricing: useRef<HTMLDivElement>(null),
    review: useRef<HTMLDivElement>(null),
  };
  const scrollToSection = (id: SectionId) =>
    sectionRefs[id].current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Validation (runs once, at Save) ──
  const validate = (): { section: SectionId; message: string } | null => {
    if (!manufacturer) return { section: "classification", message: "Select or create a manufacturer" };
    if (!category) return { section: "classification", message: "Select or create a category" };
    if (!name.trim()) return { section: "model", message: "Product model name is required" };
    const named = variants.filter((v) => v.name.trim());
    if (named.length === 0)
      return { section: "variants", message: "Add at least one variant with a name" };
    const names = named.map((v) => v.name.trim().toLowerCase());
    if (new Set(names).size !== names.length)
      return { section: "variants", message: "Variant names must be unique" };
    return null;
  };

  const updateVariant = (key: string, patch: Partial<VariantDraft>) =>
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));

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
      // Keep only filled specs; unticked checkboxes and blank values are dropped
      const attributes: AttributeValues = {};
      for (const [key, value] of Object.entries(specs)) {
        if (value === null || value === "" || value === false) continue;
        attributes[key] = value;
      }
      for (const row of customSpecs) {
        if (row.name.trim() && row.value.trim()) {
          attributes[`${CUSTOM_PREFIX}${row.name.trim()}`] = row.value.trim();
        }
      }
      const productInput: ProductInput = {
        id: editId ?? undefined,
        name: name.trim(),
        description: description.trim() || null,
        manufacturerId: manufacturer!.id,
        divisionId: division?.id ?? null,
        seriesId: series?.id ?? null,
        categoryId: category!.id,
        subCategoryId: subCategory?.id ?? null,
        attributes,
        unitId: unit?.id ?? null,
        unitName: unit?.name ?? null,
        hsnCode: hsn?.name ?? null,
        gstRate: toNum(gstRate),
        images,
        status,
      };
      const variantInputs: VariantInput[] = variants
        .filter((v) => v.name.trim())
        .map((v) => ({
          id: v.id,
          name: v.name.trim(),
          modelCode: v.modelCode.trim() || null,
          manufacturerSku: v.manufacturerSku.trim() || null,
          internalSku: v.internalSku.trim() || null,
          barcode: v.barcode.trim() || null,
          ean: v.ean.trim() || null,
          attributes: {},
          prices: Object.fromEntries(
            PRICE_FIELDS.map((f) => [f.key, toNum(v.prices[f.key])])
          ) as PriceSet,
          gstRate: toNum(v.gstRate) ?? toNum(gstRate),
          discountPercent: toNum(v.discountPercent),
          stockQty: toNum(v.stockQty),
          status: v.status,
          image: v.image,
        }));
      await saveProduct(productInput, variantInputs);
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

  const booleanDefs = attributeDefs.filter((d) => d.type === "boolean");
  const valueDefs = attributeDefs.filter((d) => d.type !== "boolean");
  const namedVariants = variants.filter((v) => v.name.trim());
  const specRows = [
    ...Object.entries(specs)
      .filter(([, v]) => v !== null && v !== "" && v !== false)
      .map(([key, v]) => ({
        label: attributeDefs.find((d) => d.id === key)?.name ?? key,
        value: v === true ? "Yes" : String(v),
      })),
    ...customSpecs
      .filter((r) => r.name.trim() && r.value.trim())
      .map((r) => ({ label: r.name.trim(), value: r.value.trim() })),
  ];
  const hierarchy = [
    { label: "Manufacturer", value: manufacturer?.name },
    { label: "Division", value: division?.name },
    { label: "Series", value: series?.name },
    { label: "Category", value: category?.name },
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
      {/* Sticky header — Save is always reachable without scrolling */}
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

        {/* Quick-jump pills — scroll to a section, nothing is locked or gated */}
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
        {/* ── Manufacturer & Classification ── */}
        <Section
          sectionRef={sectionRefs.classification}
          title="Manufacturer & Classification"
          subtitle="Manufacturer and Category are required; Division and Series keep large catalogs organised."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Manufacturer" required>
              <SearchableCombo
                value={manufacturer?.id ?? ""}
                valueLabel={manufacturer?.name}
                placeholder="Search manufacturers..."
                loadOptions={comboLoader(manufacturersApi)}
                onSelect={(item) => {
                  setManufacturer(item);
                  setDivision(null);
                  setSeries(null);
                }}
                onCreate={async (n) => manufacturersApi.create({ name: n })}
              />
            </Field>
            <Field label="Category" required>
              <SearchableCombo
                value={category?.id ?? ""}
                valueLabel={category?.name}
                placeholder="e.g. Switch, Socket, MCB, Wire..."
                loadOptions={comboLoader(categoriesApi)}
                onSelect={(item) => {
                  setCategory(item);
                  setSubCategory(null);
                  setSpecs({});
                  setCustomSpecs([]);
                }}
                onCreate={async (n) => categoriesApi.create({ name: n })}
              />
            </Field>
            <Field label="Business Division">
              <SearchableCombo
                value={division?.id ?? ""}
                valueLabel={division?.name}
                placeholder={manufacturer ? "e.g. Wiring Devices, Switchgear..." : "Select a manufacturer first"}
                allowClear
                disabled={!manufacturer}
                loadOptions={comboLoader(divisionsApi, { manufacturerId: manufacturer?.id })}
                onSelect={(item) => {
                  setDivision(item);
                  setSeries(null);
                }}
                onCreate={async (n) =>
                  divisionsApi.create({ name: n, manufacturerId: manufacturer!.id })
                }
              />
            </Field>
            <Field label="Product Series">
              <SearchableCombo
                value={series?.id ?? ""}
                valueLabel={series?.name}
                placeholder={manufacturer ? "e.g. Livia, Myrius, FR House Wire..." : "Select a manufacturer first"}
                allowClear
                disabled={!manufacturer}
                loadOptions={comboLoader(seriesApi, {
                  manufacturerId: manufacturer?.id,
                  ...(division ? { divisionId: division.id } : {}),
                })}
                onSelect={setSeries}
                onCreate={async (n) =>
                  seriesApi.create({
                    name: n,
                    manufacturerId: manufacturer!.id,
                    divisionId: division?.id ?? null,
                  })
                }
              />
            </Field>
          </div>
        </Section>

        {/* ── Product Model ── */}
        <Section sectionRef={sectionRefs.model} title="Product Model">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Product Model Name" required className="md:col-span-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 10AX 1 Way Switch"
                className="rounded-xl border-border h-10"
              />
            </Field>
            <Field label="Unit of Measure">
              <SearchableCombo
                value={unit?.id ?? ""}
                valueLabel={unit?.name}
                placeholder="Nos, Meter, Roll, Box..."
                allowClear
                loadOptions={comboLoader(unitsApi)}
                onSelect={setUnit}
                onCreate={async (n) => unitsApi.create({ name: n })}
              />
            </Field>
            <Field label="HSN Code">
              <SearchableCombo
                value={hsn?.id ?? ""}
                valueLabel={hsn?.name}
                placeholder="e.g. 8536"
                allowClear
                loadOptions={comboLoader(hsnCodesApi, undefined, (i) =>
                  typeof i.description === "string" ? i.description : undefined
                )}
                onSelect={(item) => setHsn(item ? { id: item.id, name: item.name } : null)}
                onCreate={async (n) => hsnCodesApi.create({ name: n })}
              />
            </Field>
            <Field label="Default GST Rate (%)">
              <Select
                value={gstRate}
                items={Object.fromEntries(taxRates.map((t) => [String(t.ratePercent), t.name]))}
                onValueChange={(v) => v && setGstRate(v)}
              >
                <SelectTrigger className="rounded-xl border-border h-10 w-full">
                  <SelectValue placeholder="Select GST" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {taxRates.map((t) => (
                    <SelectItem key={t.id} value={String(t.ratePercent)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description" className="md:col-span-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description shown on quotations and datasheets"
                className="rounded-xl border-border min-h-[70px]"
              />
            </Field>
          </div>
        </Section>

        {/* ── Specifications ── */}
        <Section
          sectionRef={sectionRefs.specs}
          title="Specifications"
          subtitle={
            category
              ? `Tick what applies and fill in the values for ${category.name}. Manage this list under the Categories tab.`
              : "Select a category above to see its specification fields."
          }
        >
          <div className="space-y-5">
            {booleanDefs.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2">Tick what applies</p>
                <div className="flex flex-wrap gap-2">
                  {booleanDefs.map((def) => {
                    const checked = specs[def.id] === true;
                    return (
                      <label
                        key={def.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                          checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-white hover:bg-muted/40"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSpecs((prev) => ({ ...prev, [def.id]: e.target.checked }))
                          }
                          className="h-4 w-4 rounded accent-[#6c63ff]"
                        />
                        {def.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {valueDefs.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2">Values</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {valueDefs.map((def) => (
                    <Field key={def.id} label={def.unit ? `${def.name} (${def.unit})` : def.name}>
                      <Input
                        value={specs[def.id] != null ? String(specs[def.id]) : ""}
                        onChange={(e) =>
                          setSpecs((prev) => ({ ...prev, [def.id]: e.target.value }))
                        }
                        className="rounded-xl border-border h-9"
                      />
                    </Field>
                  ))}
                </div>
              </div>
            )}

            {category && attributeDefs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No predefined specifications for{" "}
                  <span className="font-semibold">{category.name}</span> yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Define them under Categories → Specifications, or add them manually below.
                </p>
              </div>
            )}

            {/* Ad-hoc specs typed at material-creation time */}
            <div className="space-y-2">
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

        {/* ── Variants ── */}
        <Section
          sectionRef={sectionRefs.variants}
          title="Variants"
          subtitle="Variants belong to this product model — colours, finishes, pack lengths. Each variant gets its own model code and pricing."
        >
          <div className="space-y-3">
            {variants.map((v, index) => (
              <Card key={v.key} className="rounded-2xl border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground">Variant {index + 1}</p>
                  {variants.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                      onClick={() => setVariants((prev) => prev.filter((x) => x.key !== v.key))}
                      aria-label={`Remove variant ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Variant Name" required>
                    <Input
                      value={v.name}
                      onChange={(e) => updateVariant(v.key, { name: e.target.value })}
                      placeholder="e.g. White / Red — 90 Meter"
                      className="rounded-xl border-border h-9"
                    />
                  </Field>
                  <Field label="Model Code">
                    <Input
                      value={v.modelCode}
                      onChange={(e) => updateVariant(v.key, { modelCode: e.target.value })}
                      placeholder="e.g. P1010-WH"
                      className="rounded-xl border-border h-9"
                    />
                  </Field>
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => setVariants((prev) => [...prev, newVariant()])}
            >
              <Plus className="h-4 w-4" /> Add Variant
            </Button>
          </div>
        </Section>

        {/* ── Pricing ── */}
        <Section
          sectionRef={sectionRefs.pricing}
          title="Pricing"
          subtitle="Prices are per variant. Leave a field empty if it doesn’t apply."
        >
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-xs">
                  <th className="text-left font-bold px-4 py-2.5 whitespace-nowrap">Variant</th>
                  <th className="text-left font-bold px-2 py-2.5 whitespace-nowrap">Model Code</th>
                  <th className="text-left font-bold px-2 py-2.5 whitespace-nowrap">MRP (₹)</th>
                  <th className="text-left font-bold px-2 py-2.5">GST %</th>
                  <th className="text-left font-bold px-2 py-2.5 pr-4">Disc %</th>
                </tr>
              </thead>
              <tbody>
                {namedVariants.map((v) => (
                  <tr key={v.key} className="border-t border-border">
                    <td className="px-4 py-2 font-semibold whitespace-nowrap">{v.name}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {v.modelCode || "—"}
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={v.prices.mrp}
                        onChange={(e) =>
                          updateVariant(v.key, { prices: { ...v.prices, mrp: e.target.value } })
                        }
                        className="rounded-lg border-border h-8 w-28 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={v.gstRate}
                        placeholder={gstRate || ""}
                        onChange={(e) => updateVariant(v.key, { gstRate: e.target.value })}
                        className="rounded-lg border-border h-8 w-20 text-xs"
                      />
                    </td>
                    <td className="px-2 py-2 pr-4">
                      <Input
                        type="number"
                        value={v.discountPercent}
                        onChange={(e) => updateVariant(v.key, { discountPercent: e.target.value })}
                        className="rounded-lg border-border h-8 w-20 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {namedVariants.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">
              Name your variants above to enter their prices.
            </p>
          )}
        </Section>

        {/* ── Review ── */}
        <Section sectionRef={sectionRefs.review} title="Review">
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold">{name || "—"}</p>
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
                <span className="font-semibold">{unit?.name || "—"}</span>
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">HSN: </span>
                <span className="font-semibold">{hsn?.name || "—"}</span>
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">GST: </span>
                <span className="font-semibold">{gstRate ? `${gstRate}%` : "—"}</span>
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
            <div>
              <p className="text-xs font-bold mb-1.5">Variants ({namedVariants.length})</p>
              <div className="space-y-1">
                {namedVariants.length === 0 && (
                  <p className="text-xs text-muted-foreground">No variants added yet.</p>
                )}
                {namedVariants.map((v) => (
                  <p key={v.key} className="text-xs flex flex-wrap gap-x-3">
                    <span className="font-semibold">{v.name}</span>
                    {v.modelCode && <span className="text-muted-foreground">Model {v.modelCode}</span>}
                    {v.prices.mrp && <span className="text-muted-foreground">MRP ₹{v.prices.mrp}</span>}
                    {v.gstRate && <span className="text-muted-foreground">GST {v.gstRate}%</span>}
                  </p>
                ))}
              </div>
            </div>
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
