import { delay, loadCollection, paginate, saveCollection, uid, PageMeta } from "../local/store";
import { SEED_ACTIVITIES, STORAGE_KEYS } from "../local/seed-data";
import { NamedRef, UnitOfMeasure } from "./materials";
import { listCategories } from "./categories";

export const WIRING_TYPES = ["POINT_WIRING", "CIRCUIT_WIRING"] as const;
export type WiringType = (typeof WIRING_TYPES)[number];

export const PROJECT_SEGMENTS = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"] as const;
export type ProjectSegment = (typeof PROJECT_SEGMENTS)[number];

export interface ActivityRequirement {
    id?: string;
    categoryId: string;
    category?: NamedRef | null;
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
        categoryId: string;
        description: string;
        unit: UnitOfMeasure;
        quantity: number;
    }>;
}

function all(): Activity[] {
    return loadCollection<Activity>(STORAGE_KEYS.activities, SEED_ACTIVITIES as unknown as Activity[]);
}
function persist(items: Activity[]) {
    saveCollection(STORAGE_KEYS.activities, items);
}

async function buildRequirements(
    reqs: ActivityPayload["requirements"],
    activityId: string
): Promise<ActivityRequirement[]> {
    const cats = await listCategories();
    return reqs.map((r, i) => {
        const cat = cats.items.find((c) => c.id === r.categoryId) ?? null;
        return {
            id: `${activityId}-r${i}`,
            categoryId: r.categoryId,
            category: cat ? { id: cat.id, name: cat.name } : null,
            description: r.description,
            unit: r.unit,
            quantity: r.quantity,
            sortOrder: i,
        };
    });
}

let seq = 0;
function nextCode() {
    seq += 1;
    return `ACT-${String(Date.now() % 100000).padStart(5, "0")}-${seq}`;
}

export function listActivities(params: {
    page?: number;
    limit?: number;
    search?: string;
    wiringType?: WiringType;
    segment?: ProjectSegment;
} = {}): Promise<{ items: Activity[]; meta: PageMeta }> {
    let items = all();
    if (params.wiringType) items = items.filter((a) => a.wiringType === params.wiringType);
    if (params.segment) items = items.filter((a) => a.segment === params.segment);
    if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
            (a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
        );
    }
    items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return delay(paginate(items, params.page ?? 1, params.limit ?? 20));
}

export function getActivity(id: string): Promise<Activity> {
    const found = all().find((a) => a.id === id);
    if (!found) return Promise.reject(new Error("Activity not found"));
    return delay(found);
}

export async function createActivity(payload: ActivityPayload): Promise<Activity> {
    const items = all();
    const id = uid("act");
    const created: Activity = {
        id,
        code: nextCode(),
        name: payload.name,
        wiringType: payload.wiringType,
        segment: payload.segment ?? null,
        unit: (payload.unit ??
            (payload.wiringType === "POINT_WIRING" ? "POINT" : "CIRCUIT")) as Activity["unit"],
        description: payload.description ?? null,
        isActive: true,
        requirements: await buildRequirements(payload.requirements, id),
    };
    persist([created, ...items]);
    return delay(created);
}

export async function updateActivity(id: string, payload: Partial<ActivityPayload>): Promise<Activity> {
    const items = all();
    const existing = items.find((a) => a.id === id);
    if (!existing) throw new Error("Activity not found");
    const updated: Activity = {
        ...existing,
        name: payload.name ?? existing.name,
        wiringType: payload.wiringType ?? existing.wiringType,
        segment: payload.segment ?? existing.segment,
        unit: (payload.unit ?? existing.unit) as Activity["unit"],
        description: payload.description ?? existing.description,
        requirements: payload.requirements
            ? await buildRequirements(payload.requirements, id)
            : existing.requirements,
    };
    persist(items.map((a) => (a.id === id ? updated : a)));
    return delay(updated);
}

export function deleteActivity(id: string): Promise<void> {
    persist(all().filter((a) => a.id !== id));
    return delay(undefined);
}

export function wiringTypeLabel(type: WiringType): string {
    return type === "POINT_WIRING" ? "Point Wiring" : "Circuit Wiring";
}
