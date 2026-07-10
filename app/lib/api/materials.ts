import { delay, loadCollection, paginate, saveCollection, uid, PageMeta } from "../local/store";
import { SEED_MATERIALS, STORAGE_KEYS } from "../local/seed-data";
import { listCategories } from "./categories";
import { listBrands } from "./brands";

export const UNITS = ["NOS", "MTR", "SQFT", "SET", "ROLL", "KG", "LTR", "LOT"] as const;
export type UnitOfMeasure = (typeof UNITS)[number];

export interface NamedRef {
    id: string;
    name: string;
}

export interface Material {
    id: string;
    categoryId: string;
    category?: NamedRef | null;
    code: string;
    name: string;
    brandId?: string | null;
    brand?: NamedRef | null;
    series?: string | null;
    insulationType?: string | null;
    sizeSqmm?: string | number | null;
    coreCount?: number | null;
    conductorMaterial?: string | null;
    conductorConstruction?: string | null;
    currentRatingAmps?: string | number | null;
    voltageGrade?: string | null;
    standard?: string | null;
    color?: string | null;
    unit: UnitOfMeasure;
    unitPrice: string | number;
    hsnCode?: string | null;
    gstRate?: string | number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MaterialPayload {
    categoryId: string;
    code: string;
    name: string;
    brandId?: string;
    series?: string;
    insulationType?: string;
    sizeSqmm?: number;
    coreCount?: number;
    conductorMaterial?: string;
    conductorConstruction?: string;
    currentRatingAmps?: number;
    voltageGrade?: string;
    standard?: string;
    color?: string;
    unit: UnitOfMeasure;
    unitPrice?: number;
    hsnCode?: string;
    gstRate?: number;
}

export interface ListMaterialsParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    categoryId?: string;
}

function all(): Material[] {
    return loadCollection<Material>(STORAGE_KEYS.materials, SEED_MATERIALS as unknown as Material[]);
}
function persist(items: Material[]) {
    saveCollection(STORAGE_KEYS.materials, items);
}

// Resolve category/brand { id, name } from the current local collections
async function resolveRefs(categoryId: string, brandId?: string | null) {
    const [cats, brands] = await Promise.all([listCategories(), listBrands()]);
    const category = cats.items.find((c) => c.id === categoryId) ?? null;
    const brand = brandId ? brands.items.find((b) => b.id === brandId) ?? null : null;
    return {
        category: category ? { id: category.id, name: category.name } : null,
        brand: brand ? { id: brand.id, name: brand.name } : null,
    };
}

export function listMaterials(
    params: ListMaterialsParams = {}
): Promise<{ items: Material[]; meta: PageMeta }> {
    let items = all();
    if (params.categoryId) items = items.filter((m) => m.categoryId === params.categoryId);
    if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
            (m) =>
                m.code.toLowerCase().includes(q) ||
                m.name.toLowerCase().includes(q) ||
                (m.series ?? "").toLowerCase().includes(q) ||
                (m.brand?.name ?? "").toLowerCase().includes(q) ||
                (m.category?.name ?? "").toLowerCase().includes(q)
        );
    }
    items = [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return delay(paginate(items, params.page ?? 1, params.limit ?? 20));
}

export async function createMaterial(payload: MaterialPayload): Promise<Material> {
    const items = all();
    if (items.some((m) => m.code.toLowerCase() === payload.code.toLowerCase())) {
        throw new Error(`A material with code "${payload.code}" already exists`);
    }
    const refs = await resolveRefs(payload.categoryId, payload.brandId);
    const now = new Date().toISOString();
    const created: Material = {
        id: uid("mat"),
        ...payload,
        brandId: payload.brandId ?? null,
        unitPrice: payload.unitPrice ?? 0,
        category: refs.category,
        brand: refs.brand,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    } as Material;
    persist([created, ...items]);
    return delay(created);
}

export async function updateMaterial(id: string, payload: Partial<MaterialPayload>): Promise<Material> {
    const items = all();
    const existing = items.find((m) => m.id === id);
    if (!existing) throw new Error("Material not found");
    const categoryId = payload.categoryId ?? existing.categoryId;
    const brandId = payload.brandId ?? existing.brandId;
    const refs = await resolveRefs(categoryId, brandId);
    const updated: Material = {
        ...existing,
        ...payload,
        categoryId,
        brandId: brandId ?? null,
        category: refs.category,
        brand: refs.brand,
        updatedAt: new Date().toISOString(),
    } as Material;
    persist(items.map((m) => (m.id === id ? updated : m)));
    return delay(updated);
}

export function deleteMaterial(id: string): Promise<void> {
    persist(all().filter((m) => m.id !== id));
    return delay(undefined);
}
