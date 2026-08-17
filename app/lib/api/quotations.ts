import { apiDelete, apiGet, apiPatch, apiPost, PageMeta, toQueryString } from "./client";
import { UnitOfMeasure } from "./types";

export type QuotationStatus = "DRAFT" | "FINAL" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

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
    snapshotData?: any;
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
    sheetData?: unknown;
    activityRows?: Record<number, string> | null;
    activityCustomizations?: Record<number, Record<string, string>> | null;
    brandPreferences?: Record<string, { manufacturerId: string; seriesId?: string | null }> | null;
    parentQuotationId?: string | null;
    revisionNote?: string | null;
    versionTag?: string | null;
}

export interface CreateQuotationWithClientPayload {
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    projectName: string;
    startDate?: string;
    endDate?: string;
    parentQuotationId?: string;
    revisionNote?: string;
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

export function sanitizeBackendStatus(status?: string | null): string | undefined {
    if (!status) return undefined;
    if (status === "FINAL") return "SENT";
    return status;
}

export function getDisplayStatus(q: Quotation): QuotationStatus {
    if (!q) return "DRAFT";
    if ((q.sheetData as any)?.displayStatus === "FINAL" || (q.sheetData as any)?.isFinalized) {
        return "FINAL";
    }
    return q.status;
}

export function listQuotations(params: { page?: number; limit?: number } = {}): Promise<{
    items: Quotation[];
    meta: PageMeta;
}> {
    return apiGet(`/quotations${toQueryString(params)}`);
}

export function createQuotationWithClient(
    payload: CreateQuotationWithClientPayload
): Promise<Quotation> {
    const copy: any = { ...payload };
    delete copy.parentQuotationId;
    delete copy.revisionNote;
    return apiPost("/quotations", copy);
}

export function getQuotation(id: string): Promise<Quotation> {
    return apiGet(`/quotations/${id}`);
}

export function addQuotationItem(
    quotationId: string,
    payload: QuotationItemPayload
): Promise<Quotation> {
    return apiPost(`/quotations/${quotationId}/items`, payload);
}

export function updateQuotationItem(
    quotationId: string,
    itemId: string,
    payload: Partial<QuotationItemPayload>
): Promise<Quotation> {
    return apiPatch(`/quotations/${quotationId}/items/${itemId}`, payload);
}

export function removeQuotationItem(quotationId: string, itemId: string): Promise<Quotation> {
    return apiDelete(`/quotations/${quotationId}/items/${itemId}`);
}

export function updateQuotationStatus(id: string, status: QuotationStatus): Promise<Quotation> {
    const apiStatus = sanitizeBackendStatus(status);
    return apiPatch(`/quotations/${id}/status`, { status: apiStatus });
}

export function updateQuotation(id: string, payload: Partial<Quotation>): Promise<Quotation> {
    const copy: any = { ...payload };
    if (copy.status) {
        copy.status = sanitizeBackendStatus(copy.status);
    }
    delete copy.parentQuotationId;
    delete copy.revisionNote;
    delete copy.versionTag;
    return apiPatch(`/quotations/${id}`, copy);
}

export function deleteQuotation(id: string): Promise<void> {
    return apiDelete(`/quotations/${id}`);
}

export function generateQuotationDraft(id: string, prompt: string): Promise<any[]> {
    return apiPost(`/quotations/${id}/ai-generate`, { prompt });
}
