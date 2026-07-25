import { apiDelete, apiGet, apiPatch, apiPost, PageMeta, toQueryString } from "./client";
import { UnitOfMeasure } from "./types";

export const WIRING_TYPES = ["POINT_WIRING", "CIRCUIT_WIRING"] as const;
export type WiringType = (typeof WIRING_TYPES)[number];

export const PROJECT_SEGMENTS = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"] as const;
export type ProjectSegment = (typeof PROJECT_SEGMENTS)[number];

/** Activity categories, grouped by wiring type — matches the Point/Circuit Wiring Library
 *  taxonomy used across the app's activity templates. */
export const ACTIVITY_CATEGORIES: Record<WiringType, string[]> = {
    POINT_WIRING: [
        "Lighting Points",
        "Fan Points",
        "Socket Points",
        "AC Points",
        "Geyser Points",
        "Motor Points",
        "Kitchen Points",
        "Utility Points",
        "TV & Data",
        "Security",
        "Fire & Safety",
        "Automation",
        "Outdoor",
        "EV Charging",
    ],
    CIRCUIT_WIRING: [
        "Lighting Circuits",
        "Power Circuits",
        "AC Circuits",
        "Geyser Circuits",
        "Kitchen Circuits",
        "Motor Circuits",
        "UPS Circuits",
        "DG Circuits",
        "Distribution Circuits",
        "ELV Circuits",
        "Outdoor Circuits",
        "EV Circuits",
    ],
};

/** One alternate "make" (a specific catalog variant) a requirement can be fulfilled with. */
export interface ActivityRequirementOption {
    id?: string;
    variantId: string;
    isDefault: boolean;
    sortOrder?: number;
    variant?: {
        id: string;
        name: string;
        modelCode?: string | null;
        priceMrp?: string | number | null;
        product?: {
            name: string;
            manufacturer?: { id: string; name: string } | null;
        } | null;
    } | null;
}

export interface ActivityRequirement {
    id?: string;
    categoryId: string;
    category?: { id: string; name: string } | null;
    description: string;
    unit: UnitOfMeasure;
    quantity: string | number;
    sortOrder?: number;
    /** Alternate makes for this requirement — empty/absent means the plain single-description
     *  behavior (no dropdown, no default make). */
    options?: ActivityRequirementOption[];
}

export interface Activity {
    id: string;
    code: string;
    name: string;
    wiringType: WiringType;
    category?: string | null;
    segment?: ProjectSegment | null;
    unit: UnitOfMeasure | "POINT" | "CIRCUIT";
    description?: string | null;
    tenantId?: string | null;
    isActive: boolean;
    requirements: ActivityRequirement[];
    /** Opaque spreadsheet workbook blob (shape owned by the spreadsheet store —
     *  either the current multi-sheet form or, for older records, the single-sheet
     *  form saved before sheet tabs existed; `store.loadWorkbook` handles both). */
    sheetData?: unknown;
    materialCost?: number | null;
    labourCost?: number | null;
}

export interface ActivityPayload {
    name: string;
    wiringType: WiringType;
    category?: string;
    segment?: ProjectSegment;
    unit?: string;
    description?: string;
    requirements: Array<{
        categoryId: string;
        description: string;
        unit: UnitOfMeasure;
        quantity: number;
        options?: Array<{ variantId: string; isDefault?: boolean }>;
    }>;
    /** Opaque spreadsheet workbook blob (shape owned by the spreadsheet store —
     *  either the current multi-sheet form or, for older records, the single-sheet
     *  form saved before sheet tabs existed; `store.loadWorkbook` handles both). */
    sheetData?: unknown;
    materialCost?: number | null;
    labourCost?: number | null;
}

export function listActivities(params: {
    page?: number;
    limit?: number;
    search?: string;
    wiringType?: WiringType;
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

export function wiringTypeLabel(type: WiringType): string {
    return type === "POINT_WIRING" ? "Point Wiring" : "Circuit Wiring";
}
