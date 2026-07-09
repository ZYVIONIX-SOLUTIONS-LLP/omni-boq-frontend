import { apiFetch, apiFetchPaged, PageMeta } from "./client";
import { MaterialCategory, UnitOfMeasure } from "./materials";

export const WIRING_TYPES = ["POINT_WIRING", "CIRCUIT_WIRING"] as const;
export type WiringType = (typeof WIRING_TYPES)[number];

export const PROJECT_SEGMENTS = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"] as const;
export type ProjectSegment = (typeof PROJECT_SEGMENTS)[number];

export interface ActivityRequirement {
    id?: string;
    category: MaterialCategory;
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
}

export interface ActivityPayload {
    name: string;
    wiringType: WiringType;
    segment?: ProjectSegment;
    unit?: string;
    description?: string;
    requirements: Array<{
        category: MaterialCategory;
        description: string;
        unit: UnitOfMeasure;
        quantity: number;
    }>;
}

export function listActivities(params: {
    page?: number;
    limit?: number;
    search?: string;
    wiringType?: WiringType;
    segment?: ProjectSegment;
} = {}): Promise<{ items: Activity[]; meta: PageMeta }> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.wiringType) query.set("wiringType", params.wiringType);
    if (params.segment) query.set("segment", params.segment);
    const qs = query.toString();
    return apiFetchPaged<Activity>(`/activities${qs ? `?${qs}` : ""}`);
}

export function getActivity(id: string): Promise<Activity> {
    return apiFetch<Activity>(`/activities/${id}`);
}

export function createActivity(payload: ActivityPayload): Promise<Activity> {
    return apiFetch<Activity>("/activities", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function updateActivity(id: string, payload: Partial<ActivityPayload>): Promise<Activity> {
    return apiFetch<Activity>(`/activities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export function deleteActivity(id: string): Promise<void> {
    return apiFetch<void>(`/activities/${id}`, { method: "DELETE" });
}

export function wiringTypeLabel(type: WiringType): string {
    return type === "POINT_WIRING" ? "Point Wiring" : "Circuit Wiring";
}
