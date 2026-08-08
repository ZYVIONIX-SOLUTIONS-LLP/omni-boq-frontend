import { apiDelete, apiGet, apiPatch, apiPost, PageMeta, toQueryString } from "./client";
import { UnitOfMeasure } from "./types";

export const PROJECT_SEGMENTS = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"] as const;
export type ProjectSegment = (typeof PROJECT_SEGMENTS)[number];

export interface ActivityCategory {
    id: string;
    name: string;
    nameNormalized: string;
    tenantId?: string | null;
}

export interface ActivityType {
    id: string;
    name: string;
    nameNormalized: string;
    tenantId?: string | null;
    categories: ActivityCategory[];
}

export function getActivityTypes(): Promise<ActivityType[]> {
    return apiGet(`/activities/types`);
}

export function createActivityType(name: string): Promise<ActivityType> {
    return apiPost(`/activities/types`, { name });
}

export function deleteActivityType(id: string): Promise<void> {
    return apiDelete(`/activities/types/${id}`);
}

export function createActivityCategory(typeId: string, name: string): Promise<ActivityCategory> {
    return apiPost(`/activities/types/${typeId}/categories`, { name });
}

export function deleteActivityCategory(id: string): Promise<void> {
    return apiDelete(`/activities/categories/${id}`);
}

/** One alternate "make" (a specific catalog variant) a requirement can be fulfilled with. */
export interface ActivityRequirementOption {
    id?: string;
    productModelId: string;
    isDefault: boolean;
    sortOrder?: number;
    productModel?: {
        id: string;
        manufacturerName?: string | null;
        series?: string | null;
        modelCode?: string | null;
        mrp?: string | number | null;
        manufacturer?: { id: string; name: string } | null;
    } | null;
}

export interface ActivityRequirement {
    id?: string;
    categoryId: string;
    category?: { id: string; name: string } | null;
    subCategoryId?: string | null;
    subCategory?: { id: string; name: string } | null;
    requiredAttributes?: Record<string, any> | null;
    description: string;
    unit: UnitOfMeasure;
    quantity: string | number;
    discountPercent?: string | number;
    taxPercent?: string | number;
    sortOrder?: number;
    /** Alternate makes for this requirement — empty/absent means the plain single-description
     *  behavior (no dropdown, no default make). */
    options?: ActivityRequirementOption[];
}

/** A standalone cost line not tied to any category/product — labour, delivery, testing, etc. */
export interface ActivityCharge {
    id?: string;
    description: string;
    amount: string | number;
    sortOrder?: number;
}

export interface Activity {
    id: string;
    code: string;
    name: string;
    wiringType: string;
    category?: string | null;
    segment?: ProjectSegment | null;
    unit: UnitOfMeasure | "POINT" | "CIRCUIT";
    description?: string | null;
    tenantId?: string | null;
    isActive: boolean;
    requirements: ActivityRequirement[];
    charges: ActivityCharge[];
    materialCost?: number | null;
    labourCost?: number | null;
}

export interface ActivityPayload {
    name: string;
    wiringType: string;
    category?: string;
    segment?: ProjectSegment;
    unit?: string;
    description?: string;
    requirements: Array<{
        categoryId: string;
        subCategoryId?: string;
        requiredAttributes?: Record<string, any>;
        description: string;
        unit: UnitOfMeasure;
        quantity: number;
        discountPercent?: number;
        taxPercent?: number;
        options?: Array<{ productModelId: string; isDefault?: boolean }>;
    }>;
    charges?: Array<{ description: string; amount: number }>;
    materialCost?: number | null;
    labourCost?: number | null;
}

export function listActivities(params: {
    page?: number;
    limit?: number;
    search?: string;
    wiringType?: string;
    segment?: ProjectSegment;
    scope?: "global" | "local" | "all";
} = {}): Promise<{ items: Activity[]; meta: PageMeta }> {
    return apiGet(`/activities${toQueryString(params)}`);
}

export function getActivity(id: string): Promise<Activity> {
    return apiGet(`/activities/${id}`);
}

export function createActivity(payload: ActivityPayload): Promise<Activity> {
    return apiPost("/activities", payload);
}

export function updateActivity(id: string, payload: Partial<ActivityPayload>): Promise<Activity> {
    return apiPatch(`/activities/${id}`, payload);
}

export function deleteActivity(id: string): Promise<void> {
    return apiDelete(`/activities/${id}`);
}

export function deleteAllActivities(): Promise<void> {
    return apiDelete(`/activities/all`);
}

export function duplicateActivity(id: string, name: string): Promise<Activity> {
    return apiPost(`/activities/${id}/duplicate`, { name });
}

export function wiringTypeLabel(type: string): string {
    // If it's the old static snake_case, format it, otherwise just return the dynamic name
    if (type === "POINT_WIRING") return "Point Wiring";
    if (type === "CIRCUIT_WIRING") return "Circuit Wiring";
    return type;
}
