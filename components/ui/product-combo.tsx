"use client";

import { useCallback } from "react";
import SearchableCombo, { ComboPage } from "@/components/ui/searchable-combo";
import { listProducts } from "@/app/lib/catalog/api";

export default function ProductCombo({
  value,
  valueLabel,
  onChange,
  onCreate,
  disabled
}: {
  value: string;
  valueLabel: string;
  onChange: (id: string, name: string) => void;
  onCreate: () => void;
  disabled?: boolean;
}) {
  const load = useCallback(async (search: string, page: number): Promise<ComboPage> => {
    const res = await listProducts({ search, page, limit: 40 });
    return {
      items: res.items.map(p => ({
        id: p.id,
        name: p.modelCode || p.name || "Unnamed Product",
        hint: p.manufacturerName ? "Make:  | MRP: ?" : "MRP: ?"
      })),
      hasMore: res.meta.hasNextPage,
    };
  }, []);

  return (
    <SearchableCombo
      value={value}
      valueLabel={valueLabel}
      loadOptions={load}
      onSelect={(item) => onChange(item?.id || "", item?.name || "")}
      onCreate={async (name) => { onCreate(); return {id: "temp", name: "temp"}; }}
      createLabel="Create New Material"
      placeholder="Search material..."
      disabled={disabled}
      allowClear
    />
  );
}
