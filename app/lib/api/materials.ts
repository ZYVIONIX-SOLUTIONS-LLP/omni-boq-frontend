import { apiFetch, apiFetchPaged, PageMeta } from "./client";

export const MATERIAL_CATEGORIES = [
    "WIRE",
    "SWITCH",
    "SOCKET",
    "METAL_BOX",
    "PVC_BOX",
    "COVER_FRAME",
    "PVC_CONDUIT",
    "FAN_REGULATOR",
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

/** "METAL_BOX" -> "Metal Box" */
export function categoryLabel(category: string): string {
    return category
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");
}

export const UNITS = ["NOS", "MTR", "SQFT", "SET", "ROLL", "KG", "LTR", "LOT"] as const;
export type UnitOfMeasure = (typeof UNITS)[number];

export interface Material {
    id: string;
    category: MaterialCategory;
    code: string;
    name: string;
    brand?: string | null;
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
    category: MaterialCategory;
    code: string;
    name: string;
    brand?: string;
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
    category?: MaterialCategory;
}

export function listMaterials(
    params: ListMaterialsParams = {}
): Promise<{ items: Material[]; meta: PageMeta }> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    if (params.category) query.set("category", params.category);

    const qs = query.toString();
    return apiFetchPaged<Material>(`/materials${qs ? `?${qs}` : ""}`);
}

export function createMaterial(payload: MaterialPayload): Promise<Material> {
    return apiFetch<Material>("/materials", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function updateMaterial(
    id: string,
    payload: Partial<MaterialPayload>
): Promise<Material> {
    return apiFetch<Material>(`/materials/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export function deleteMaterial(id: string): Promise<void> {
    return apiFetch<void>(`/materials/${id}`, { method: "DELETE" });
}
