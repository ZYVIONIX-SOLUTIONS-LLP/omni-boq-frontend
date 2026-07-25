"use client";

// Reference data for the catalog: Units of measure, GST tax rates, HSN codes.

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hsnCodesApi, taxRatesApi, unitsApi } from "@/app/lib/catalog/api";
import type { HsnCode, TaxRate, UnitDef } from "@/app/lib/catalog/types";

// ── Units ────────────────────────────────────────────────────────────────────

function UnitsCard() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [items, setItems] = useState<UnitDef[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    unitsApi.list({ limit: 500 }).then((r) => setItems(r.items));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async () => {
    if (!name.trim()) return;
    setError("");
    try {
      await unitsApi.create({ name, symbol: symbol.trim() || null });
      setName("");
      setSymbol("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border-border bg-white p-5 space-y-4">
      <div>
        <p className="text-sm font-bold">Units of Measure</p>
        <p className="text-[11px] text-muted-foreground">Nos, Meter, Roll, Box, Packet, Kg, Coil...</p>
      </div>
      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {items.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2"
          >
            <p className="text-sm font-semibold">
              {u.name}{" "}
              {u.symbol && <span className="text-xs text-muted-foreground font-normal">({u.symbol})</span>}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500 shrink-0"
              onClick={async () => {
                await unitsApi.remove(u.id);
                refresh();
              }}
              aria-label={`Delete ${u.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Unit name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="rounded-xl border-border h-9"
        />
        <Input
          placeholder="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="rounded-xl border-border h-9 w-24"
        />
        <Button
          size="icon"
          onClick={add}
          disabled={!name.trim()}
          className="h-9 w-9 rounded-lg bg-primary text-white shrink-0"
          aria-label="Add unit"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </Card>
  );
}

// ── Tax rates ────────────────────────────────────────────────────────────────

function TaxCard() {
  const [rate, setRate] = useState("");
  const [items, setItems] = useState<TaxRate[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    taxRatesApi
      .list({ limit: 500 })
      .then((r) => setItems([...r.items].sort((a, b) => a.ratePercent - b.ratePercent)));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async () => {
    const value = Number(rate);
    if (rate.trim() === "" || Number.isNaN(value)) return;
    setError("");
    try {
      await taxRatesApi.create({ name: `GST ${value}%`, ratePercent: value });
      setRate("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border-border bg-white p-5 space-y-4">
      <div>
        <p className="text-sm font-bold">GST Tax Rates</p>
        <p className="text-[11px] text-muted-foreground">Offered in pricing dropdowns</p>
      </div>
      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {items.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2"
          >
            <p className="text-sm font-semibold">{t.name}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500 shrink-0"
              onClick={async () => {
                await taxRatesApi.remove(t.id);
                refresh();
              }}
              aria-label={`Delete ${t.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Rate % (e.g. 18)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="rounded-xl border-border h-9"
        />
        <Button
          size="icon"
          onClick={add}
          disabled={rate.trim() === ""}
          className="h-9 w-9 rounded-lg bg-primary text-white shrink-0"
          aria-label="Add tax rate"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </Card>
  );
}

// ── HSN codes ────────────────────────────────────────────────────────────────

function HsnCard() {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<HsnCode[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    hsnCodesApi.list({ limit: 500 }).then((r) => setItems(r.items));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async () => {
    if (!code.trim()) return;
    setError("");
    try {
      await hsnCodesApi.create({ name: code, description: description.trim() || null });
      setCode("");
      setDescription("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border-border bg-white p-5 space-y-4">
      <div>
        <p className="text-sm font-bold">HSN Codes</p>
        <p className="text-[11px] text-muted-foreground">Harmonised codes used on invoices</p>
      </div>
      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {items.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{h.name}</p>
              {h.description && (
                <p className="text-[11px] text-muted-foreground truncate">{h.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500 shrink-0"
              onClick={async () => {
                await hsnCodesApi.remove(h.id);
                refresh();
              }}
              aria-label={`Delete ${h.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="rounded-xl border-border h-9 w-28"
        />
        <Input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="rounded-xl border-border h-9"
        />
        <Button
          size="icon"
          onClick={add}
          disabled={!code.trim()}
          className="h-9 w-9 rounded-lg bg-primary text-white shrink-0"
          aria-label="Add HSN code"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </Card>
  );
}

export default function CatalogSettingsPage() {
  return (
    <div className="px-7 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
        <UnitsCard />
        <TaxCard />
        <HsnCard />
      </div>
    </div>
  );
}
