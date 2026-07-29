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

export interface Manufacturer extends BaseEntity {}

// Division and ProductSeries entities removed

/** Global category taxonomy (Switch, Socket, MCB, Wire, ...). */
export interface CatalogCategory extends BaseEntity {
  hsnCode?: string | null;
  defaultGstRate?: number | null;
}

export interface SubCategory extends BaseEntity {
  categoryId: string;
}

// ── Attribute system (per-category dynamic specifications) ──────────────────

export type AttributeType = "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";

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

// Reference data like UnitDef, TaxRate, HsnCode removed as they are just text inputs now

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

export type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";
export type VoltageClass = "LV" | "MV" | "HV" | "EHV";

export interface ProductModel {
  id: string;
  tenantId?: string | null;

  manufacturerId?: string | null;
  manufacturerName?: string | null;
  series?: string | null;
  voltageClass?: VoltageClass | null;
  
  categoryId?: string | null;
  categoryName?: string | null;
  subCategoryId?: string | null;
  subCategoryName?: string | null;

  name?: string | null;
  color?: string | null;
  modelCode?: string | null;

  attributes: AttributeValues;

  unit?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  mrp?: number | null;
  discountPercent?: number | null;

  images: ProductImages;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;

  // Populated for products referencing global master
  manufacturer?: NamedRef | null;
  category?: NamedRef | null;
  subCategory?: NamedRef | null;
}
