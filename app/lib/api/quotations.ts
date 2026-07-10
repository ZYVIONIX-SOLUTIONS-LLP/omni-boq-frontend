import { delay, loadCollection, paginate, saveCollection, uid, PageMeta } from "../local/store";
import { STORAGE_KEYS } from "../local/seed-data";
import { UnitOfMeasure } from "./materials";

export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface QuotationCustomer {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
}
export interface QuotationProject {
    id: string;
    code: string;
    name: string;
    startDate?: string | null;
    endDate?: string | null;
}
export interface QuotationItem {
    id: string;
    description: string;
    unit: string;
    quantity: string | number;
    rate: string | number;
    discountPct: string | number;
    profitPct: string | number;
    taxRate: string | number;
    amount: string | number;
    sortOrder: number;
}
export interface Quotation {
    id: string;
    code: string;
    status: QuotationStatus;
    subTotal: string | number;
    taxTotal: string | number;
    grandTotal: string | number;
    validTill?: string | null;
    termsAndConditions?: string | null;
    createdAt: string;
    customer?: QuotationCustomer | null;
    project?: QuotationProject | null;
    items?: QuotationItem[];
}

export interface CreateQuotationWithClientPayload {
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    projectName: string;
    startDate?: string;
    endDate?: string;
}
export interface QuotationItemPayload {
    description: string;
    unit: UnitOfMeasure | "POINT" | "CIRCUIT";
    quantity: number;
    rate: number;
    discountPct?: number;
    profitPct?: number;
    taxRate?: number;
}

function all(): Quotation[] {
    return loadCollection<Quotation>(STORAGE_KEYS.quotations, []);
}
function persist(items: Quotation[]) {
    saveCollection(STORAGE_KEYS.quotations, items);
}

// ── money math (mirrors the intended backend logic) ──
function finalRateOf(rate: number, discountPct = 0, profitPct = 0): number {
    return rate * (1 - discountPct / 100) * (1 + profitPct / 100);
}
function lineAmount(item: {
    rate: number;
    quantity: number;
    discountPct?: number;
    profitPct?: number;
}): number {
    return finalRateOf(item.rate, item.discountPct, item.profitPct) * item.quantity;
}
function recompute(q: Quotation): Quotation {
    const items = q.items ?? [];
    let subTotal = 0;
    let taxTotal = 0;
    for (const it of items) {
        const amt = lineAmount({
            rate: Number(it.rate),
            quantity: Number(it.quantity),
            discountPct: Number(it.discountPct),
            profitPct: Number(it.profitPct),
        });
        subTotal += amt;
        taxTotal += amt * (Number(it.taxRate) / 100);
    }
    return {
        ...q,
        subTotal: Number(subTotal.toFixed(2)),
        taxTotal: Number(taxTotal.toFixed(2)),
        grandTotal: Number((subTotal + taxTotal).toFixed(2)),
    };
}

function save(q: Quotation) {
    const items = all();
    persist(items.map((x) => (x.id === q.id ? q : x)));
}

let quoteSeq = 0;
let projSeq = 0;

export function listQuotations(params: { page?: number; limit?: number } = {}): Promise<{
    items: Quotation[];
    meta: PageMeta;
}> {
    const items = [...all()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return delay(paginate(items, params.page ?? 1, params.limit ?? 10));
}

export function createQuotationWithClient(
    payload: CreateQuotationWithClientPayload
): Promise<Quotation> {
    const items = all();
    quoteSeq += 1;
    projSeq += 1;
    const now = new Date().toISOString();
    const created: Quotation = {
        id: uid("quo"),
        code: `QUO-${String(items.length + quoteSeq).padStart(6, "0")}`,
        status: "DRAFT",
        subTotal: 0,
        taxTotal: 0,
        grandTotal: 0,
        createdAt: now,
        customer: {
            id: uid("cust"),
            name: payload.clientName,
            phone: payload.clientPhone ?? null,
            address: payload.clientAddress ?? null,
        },
        project: {
            id: uid("proj"),
            code: `PRJ-${String(items.length + projSeq).padStart(6, "0")}`,
            name: payload.projectName,
            startDate: payload.startDate ?? null,
            endDate: payload.endDate ?? null,
        },
        items: [],
    };
    persist([created, ...items]);
    return delay(created);
}

export function getQuotation(id: string): Promise<Quotation> {
    const found = all().find((q) => q.id === id);
    if (!found) return Promise.reject(new Error("Quotation not found"));
    return delay(found);
}

export function addQuotationItem(
    quotationId: string,
    payload: QuotationItemPayload
): Promise<Quotation> {
    const q = all().find((x) => x.id === quotationId);
    if (!q) return Promise.reject(new Error("Quotation not found"));
    const items = q.items ?? [];
    const item: QuotationItem = {
        id: uid("qitem"),
        description: payload.description,
        unit: payload.unit,
        quantity: payload.quantity,
        rate: payload.rate,
        discountPct: payload.discountPct ?? 0,
        profitPct: payload.profitPct ?? 0,
        taxRate: payload.taxRate ?? 0,
        amount: Number(
            lineAmount({
                rate: payload.rate,
                quantity: payload.quantity,
                discountPct: payload.discountPct,
                profitPct: payload.profitPct,
            }).toFixed(2)
        ),
        sortOrder: items.length,
    };
    const updated = recompute({ ...q, items: [...items, item] });
    save(updated);
    return delay(updated);
}

export function updateQuotationItem(
    quotationId: string,
    itemId: string,
    payload: Partial<QuotationItemPayload>
): Promise<Quotation> {
    const q = all().find((x) => x.id === quotationId);
    if (!q) return Promise.reject(new Error("Quotation not found"));
    const items = (q.items ?? []).map((it) => {
        if (it.id !== itemId) return it;
        const merged = {
            ...it,
            ...payload,
        } as QuotationItem;
        merged.amount = Number(
            lineAmount({
                rate: Number(merged.rate),
                quantity: Number(merged.quantity),
                discountPct: Number(merged.discountPct),
                profitPct: Number(merged.profitPct),
            }).toFixed(2)
        );
        return merged;
    });
    const updated = recompute({ ...q, items });
    save(updated);
    return delay(updated);
}

export function removeQuotationItem(quotationId: string, itemId: string): Promise<Quotation> {
    const q = all().find((x) => x.id === quotationId);
    if (!q) return Promise.reject(new Error("Quotation not found"));
    const updated = recompute({ ...q, items: (q.items ?? []).filter((it) => it.id !== itemId) });
    save(updated);
    return delay(updated);
}

export function updateQuotationStatus(id: string, status: QuotationStatus): Promise<Quotation> {
    const q = all().find((x) => x.id === id);
    if (!q) return Promise.reject(new Error("Quotation not found"));
    const updated = { ...q, status };
    save(updated);
    return delay(updated);
}
