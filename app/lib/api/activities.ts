import { apiDelete, apiGet, apiPatch, apiPost, PageMeta, toQueryString } from "./client";
import { UnitOfMeasure } from "./types";

export const WIRING_TYPES = ["POINT_WIRING", "CIRCUIT_WIRING"] as const;
export type WiringType = (typeof WIRING_TYPES)[number];

export const PROJECT_SEGMENTS = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"] as const;
export type ProjectSegment = (typeof PROJECT_SEGMENTS)[number];

export interface ActivityRequirement {
    id?: string;
    categoryId: string;
    category?: { id: string; name: string } | null;
    description: string;
    unit: UnitOfMeasure;
    quantity: string | number;
    sortOrder?: number;
}

export interface Activity {
    id: string;
    code: string;
    name: string;
    wiringType: WiringType;
    segment?: ProjectSegment | null;
    unit: UnitOfMeasure | "POINT" | "CIRCUIT";
    description?: string | null;
    isActive: boolean;
    requirements: ActivityRequirement[];
    sheetData?: {
        rowCount: number;
        colCount: number;
        cells: [string, any][];
        colWidths?: [number, number][];
    } | null;
    materialCost?: number | null;
    labourCost?: number | null;
}

export interface ActivityPayload {
    name: string;
    wiringType: WiringType;
    segment?: ProjectSegment;
    unit?: string;
    description?: string;
    requirements: Array<{
        categoryId: string;
        description: string;
        unit: UnitOfMeasure;
        quantity: number;
    }>;
    sheetData?: {
        rowCount: number;
        colCount: number;
        cells: [string, any][];
        colWidths?: [number, number][];
    } | null;
    materialCost?: number | null;
    labourCost?: number | null;
}

export function listActivities(params: {
    page?: number;
    limit?: number;
    search?: string;
    wiringType?: WiringType;
    segment?: ProjectSegment;
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

export function duplicateActivity(id: string, name: string): Promise<Activity> {
    return apiPost(`/activities/${id}/duplicate`, { name });
}

export function wiringTypeLabel(type: WiringType): string {
    return type === "POINT_WIRING" ? "Point Wiring" : "Circuit Wiring";
}
