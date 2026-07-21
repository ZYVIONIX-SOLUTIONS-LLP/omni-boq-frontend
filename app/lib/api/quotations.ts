import { apiDelete, apiGet, apiPatch, apiPost, PageMeta, toQueryString } from "./client";
import { UnitOfMeasure } from "./types";

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
    sheetData?: {
        rowCount: number;
        colCount: number;
        cells: [string, any][];
        colWidths?: [number, number][];
        rowHeights?: [number, number][];
    } | null;
    activityRows?: Record<number, string> | null;
    activityCustomizations?: Record<number, Record<string, string>> | null;
    brandPreferences?: {
        wiresId?: string | null;
        conduitsId?: string | null;
        accessoriesId?: string | null;
        accessoriesSeriesId?: string | null;
        switchgearId?: string | null;
        switchgearSeriesId?: string | null;
    } | null;
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

export function listQuotations(params: { page?: number; limit?: number } = {}): Promise<{
    items: Quotation[];
    meta: PageMeta;
}> {
    return apiGet(`/quotations${toQueryString(params)}`);
}

export function createQuotationWithClient(
    payload: CreateQuotationWithClientPayload
): Promise<Quotation> {
    return apiPost("/quotations", payload);
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
    return apiPatch(`/quotations/${id}/status`, { status });
}

export function updateQuotation(id: string, payload: Partial<Quotation>): Promise<Quotation> {
    return apiPatch(`/quotations/${id}`, payload);
}

export function deleteQuotation(id: string): Promise<void> {
    return apiDelete(`/quotations/${id}`);
}
