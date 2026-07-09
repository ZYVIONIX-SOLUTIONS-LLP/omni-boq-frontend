"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WIRING_TYPES, WiringType, wiringTypeLabel } from "@/app/lib/api/activities";
import {
  getQuotation,
  Quotation,
  QuotationItem,
  removeQuotationItem,
  updateQuotationItem,
} from "@/app/lib/api/quotations";
import AddActivityDialog from "./add-activity-dialog";

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function rateAfterDiscount(rate: number, discountPct: number): number {
  return rate * (1 - discountPct / 100);
}
function finalRate(rate: number, discountPct: number, profitPct: number): number {
  return rateAfterDiscount(rate, discountPct) * (1 + profitPct / 100);
}

/** One editable quotation line. Discount% and Profit% are inline-editable; the rest is derived. */
function ItemRow({
  item,
  index,
  quotationId,
  onUpdated,
  onRemove,
  removing,
}: {
  item: QuotationItem;
  index: number;
  quotationId: string;
  onUpdated: (q: Quotation) => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const rate = Number(item.rate);
  const qty = Number(item.quantity);

  // Local editable state for the two percentage inputs (kept in sync with the item)
  const [discount, setDiscount] = useState(String(Number(item.discountPct)));
  const [profit, setProfit] = useState(String(Number(item.profitPct)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDiscount(String(Number(item.discountPct)));
    setProfit(String(Number(item.profitPct)));
  }, [item.discountPct, item.profitPct]);

  const discNum = Number(discount) || 0;
  const profNum = Number(profit) || 0;
  const afterDisc = rateAfterDiscount(rate, discNum);
  const costAmount = afterDisc * qty; // "Amount" = your cost
  const finalR = finalRate(rate, discNum, profNum);

  const persist = async (patch: { discountPct?: number; profitPct?: number }) => {
    setSaving(true);
    try {
      onUpdated(await updateQuotationItem(quotationId, item.id, patch));
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="pl-5 text-sm text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="text-sm">{item.description}</TableCell>
      <TableCell className="text-sm">{item.unit}</TableCell>
      <TableCell className="text-sm text-right">{money(rate)}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          value={discount}
          disabled={saving}
          onChange={(e) => setDiscount(e.target.value)}
          onBlur={() => discNum !== Number(item.discountPct) && persist({ discountPct: discNum })}
          className="h-8 w-16 rounded-lg border-border text-right text-sm ml-auto"
        />
      </TableCell>
      <TableCell className="text-sm text-right">{money(afterDisc)}</TableCell>
      <TableCell className="text-sm text-right">{qty}</TableCell>
      <TableCell className="text-sm text-right">{money(costAmount)}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          value={profit}
          disabled={saving}
          onChange={(e) => setProfit(e.target.value)}
          onBlur={() => profNum !== Number(item.profitPct) && persist({ profitPct: profNum })}
          className="h-8 w-16 rounded-lg border-border text-right text-sm ml-auto"
        />
      </TableCell>
      <TableCell className="text-sm text-right font-semibold">{money(finalR)}</TableCell>
      <TableCell className="pr-5 text-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={removing}
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
          aria-label="Remove item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<WiringType>("POINT_WIRING");
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setQuotation(await getQuotation(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      setQuotation(await removeQuotationItem(id, itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <div className="px-7 py-10 text-sm text-muted-foreground">Loading quotation...</div>;
  }
  if (!quotation) {
    return (
      <div className="px-7 py-10">
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
          {error || "Quotation not found"}
        </p>
      </div>
    );
  }

  const items = quotation.items ?? [];

  return (
    <div className="px-7 py-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => router.push("/Quotations")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Quotations
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{quotation.code}</h2>
            <Badge className="bg-gray-100 text-gray-700 border-0 rounded-full px-3 font-semibold">
              {quotation.status.charAt(0) + quotation.status.slice(1).toLowerCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quotation.customer?.name}
            {quotation.project?.name ? ` · ${quotation.project.name}` : ""}
          </p>
        </div>
        <Card className="rounded-2xl border-border shadow-sm bg-white px-5 py-3 text-right">
          <p className="text-xs text-muted-foreground">Grand Total</p>
          <p className="text-2xl font-extrabold text-primary">{money(Number(quotation.grandTotal))}</p>
        </Card>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {/* ── Point / Circuit tabs ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center rounded-xl bg-muted/60 p-1">
          {WIRING_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setTab(type)}
              className={
                tab === type
                  ? "px-4 py-2 rounded-lg text-sm font-semibold bg-white text-primary shadow-sm"
                  : "px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {wiringTypeLabel(type)}
            </button>
          ))}
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95"
        >
          <Plus className="h-4 w-4" />
          Add {wiringTypeLabel(tab)} Item
        </Button>
      </div>

      {/* ── Items table ── */}
      <Card className="rounded-2xl shadow-sm border-border overflow-x-auto bg-white p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-bold text-xs pl-5 w-10">#</TableHead>
              <TableHead className="font-bold text-xs min-w-[180px]">Description</TableHead>
              <TableHead className="font-bold text-xs">Unit</TableHead>
              <TableHead className="font-bold text-xs text-right">Rate</TableHead>
              <TableHead className="font-bold text-xs text-right">Disc %</TableHead>
              <TableHead className="font-bold text-xs text-right">After Disc</TableHead>
              <TableHead className="font-bold text-xs text-right">Qty</TableHead>
              <TableHead className="font-bold text-xs text-right">Amount</TableHead>
              <TableHead className="font-bold text-xs text-right">Profit %</TableHead>
              <TableHead className="font-bold text-xs text-right">Final Rate</TableHead>
              <TableHead className="font-bold text-xs text-center pr-5 w-12">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-sm text-muted-foreground">
                  No items yet. Use “Add {wiringTypeLabel(tab)} Item” to pick an activity.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  quotationId={id}
                  onUpdated={(q) => setQuotation(q)}
                  onRemove={() => handleRemove(item.id)}
                  removing={removingId === item.id}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Totals ── */}
      <div className="flex justify-end">
        <Card className="rounded-2xl border-border shadow-sm bg-white p-4 w-72 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{money(Number(quotation.subTotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-semibold">{money(Number(quotation.taxTotal))}</span>
          </div>
          <div className="flex justify-between text-base border-t border-border pt-1.5">
            <span className="font-bold text-foreground">Grand Total</span>
            <span className="font-extrabold text-primary">{money(Number(quotation.grandTotal))}</span>
          </div>
        </Card>
      </div>

      <AddActivityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        quotationId={id}
        wiringType={tab}
        onAdded={(updated) => setQuotation(updated)}
      />
    </div>
  );
}
