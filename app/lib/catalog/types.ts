// ─────────────────────────────────────────────────────────────────────────────
// Product catalog domain types.
//
// The catalog is modelled as a generic hierarchy so new manufacturers,
// categories and attributes can be added purely as DATA — no UI changes:
//
//   Manufacturer → Division → Series → Category → SubCategory
//        → ProductModel → Variant → Prices
//
// Specifications are never hardcoded: every Category owns a list of
// AttributeDef rows and the UI renders whatever it finds there.
// ─────────────────────────────────────────────────────────────────────────────

export interface NamedRef {
  id: string;
  name: string;
}

export interface BaseEntity {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Hierarchy entities ───────────────────────────────────────────────────────

export interface Manufacturer extends BaseEntity {
  code?: string | null;
  country?: string | null;
  website?: string | null;
}

/** Business division of a manufacturer (Wiring Devices, Switchgear, ...). */
export interface Division extends BaseEntity {
  manufacturerId: string;
}

/** Product series of a manufacturer (Livia, Myrius, FR House Wire, ...). */
export interface ProductSeries extends BaseEntity {
  manufacturerId: string;
  divisionId?: string | null;
}

/** Global category taxonomy (Switch, Socket, MCB, Wire, ...). */
export interface CatalogCategory extends BaseEntity {
  hsnCode?: string | null;
  defaultGstRate?: number | null;
}

export interface SubCategory extends BaseEntity {
  categoryId: string;
}

// ── Attribute system (per-category dynamic specifications) ──────────────────

export type AttributeType = "text" | "number" | "select" | "boolean";

export interface AttributeDef extends BaseEntity {
  categoryId: string;
  /** Input type used when rendering the specification form. */
  type: AttributeType;
  /** Display unit suffix, e.g. "A", "sq.mm", "K", "W". */
  unit?: string | null;
  /** Allowed values when type === "select". */
  options: string[];
  required: boolean;
  sortOrder: number;
}

export type AttributeValue = string | number | boolean | null;
export type AttributeValues = Record<string, AttributeValue>;

// ── Reference data ───────────────────────────────────────────────────────────

export interface UnitDef extends BaseEntity {
  symbol?: string | null;
}

export interface TaxRate extends BaseEntity {
  ratePercent: number;
}

export interface HsnCode extends BaseEntity {
  /** name holds the HSN/SAC code itself; description holds the label. */
  gstRate?: number | null;
}

// ── Files / images (metadata only — real upload comes with the backend) ─────

export interface FileMeta {
  name: string;
  size: number;
  type: string;
  /** Small files keep an inline preview; large ones store metadata only. */
  dataUrl?: string | null;
}

export interface ProductImages {
  primary?: FileMeta | null;
  gallery: FileMeta[];
  datasheet?: FileMeta | null;
  brochure?: FileMeta | null;
  manual?: FileMeta | null;
}

// ── Pricing ──────────────────────────────────────────────────────────────────

export interface PriceSet {
  mrp?: number | null;
  dealer?: number | null;
  distributor?: number | null;
  contractor?: number | null;
  purchase?: number | null;
  offer?: number | null;
}

export const PRICE_FIELDS: { key: keyof PriceSet; label: string }[] = [
  { key: "mrp", label: "MRP" },
  { key: "dealer", label: "Dealer" },
  { key: "distributor", label: "Distributor" },
  { key: "contractor", label: "Contractor" },
  { key: "purchase", label: "Purchase" },
  { key: "offer", label: "Offer" },
];

// ── Product model + variants ─────────────────────────────────────────────────

export type VariantStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

export interface Variant {
  id: string;
  productId: string;
  /** Variant display name, e.g. "White", "Red — 90 Meter". */
  name: string;
  /** Per-variant model/part code, e.g. "P1005_NP". */
  modelCode?: string | null;
  manufacturerSku?: string | null;
  internalSku?: string | null;
  barcode?: string | null;
  ean?: string | null;
  /** Variant-level attribute values (colour, length, ...). */
  attributes: AttributeValues;
  prices: PriceSet;
  gstRate?: number | null;
  discountPercent?: number | null;
  stockQty?: number | null;
  status: VariantStatus;
  image?: FileMeta | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductModel {
  id: string;
  tenantId?: string | null;
  name: string;
  description?: string | null;

  manufacturerId?: string | null;
  manufacturerName?: string | null;
  divisionId?: string | null;
  seriesId?: string | null;
  seriesName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  subCategoryId?: string | null;
  subCategoryName?: string | null;

  // Denormalised names so lists render without join lookups. Populated for
  // products that reference the global catalog (SuperAdmin-created); Admin/Staff
  // free-text products carry only the *Name string fields above instead.
  manufacturer?: NamedRef | null;
  division?: NamedRef | null;
  series?: NamedRef | null;
  category?: NamedRef | null;
  subCategory?: NamedRef | null;

  /** Model-level specification values keyed by AttributeDef id. */
  attributes: AttributeValues;

  unitId?: string | null;
  unitName?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;

  images: ProductImages;
  status: VariantStatus;
  createdAt: string;
  updatedAt: string;
}

/** Product + its variants, as consumed by the library & wizard. */
export interface ProductWithVariants extends ProductModel {
  variants: Variant[];
}
