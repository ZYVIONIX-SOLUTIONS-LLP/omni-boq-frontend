import { apiFetch, apiFetchPaged, PageMeta } from "./client";
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

export function listQuotations(params: { page?: number; limit?: number } = {}): Promise<{
    items: Quotation[];
    meta: PageMeta;
}> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiFetchPaged<Quotation>(`/quotation${qs ? `?${qs}` : ""}`);
}

export function createQuotationWithClient(
    payload: CreateQuotationWithClientPayload
): Promise<Quotation> {
    return apiFetch<Quotation>("/quotation/with-client", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function getQuotation(id: string): Promise<Quotation> {
    return apiFetch<Quotation>(`/quotation/${id}`);
}

export function addQuotationItem(
    quotationId: string,
    payload: QuotationItemPayload
): Promise<Quotation> {
    return apiFetch<Quotation>(`/quotation/${quotationId}/items`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function updateQuotationItem(
    quotationId: string,
    itemId: string,
    payload: Partial<QuotationItemPayload>
): Promise<Quotation> {
    return apiFetch<Quotation>(`/quotation/${quotationId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export function removeQuotationItem(quotationId: string, itemId: string): Promise<Quotation> {
    return apiFetch<Quotation>(`/quotation/${quotationId}/items/${itemId}`, {
        method: "DELETE",
    });
}

export function updateQuotationStatus(
    id: string,
    status: QuotationStatus
): Promise<Quotation> {
    return apiFetch<Quotation>(`/quotation/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
}
