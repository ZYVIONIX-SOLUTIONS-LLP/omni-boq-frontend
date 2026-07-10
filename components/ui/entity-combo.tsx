"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ComboOption {
  id: string;
  name: string;
}

/**
 * A dropdown of existing options plus an inline "+ New" affordance that creates a new
 * option via `onCreate` and selects it. Used for dynamic Category / Brand selection.
 */
export default function EntityCombo({
  value,
  options,
  placeholder,
  onChange,
  onCreate,
  disabled,
  triggerClassName,
}: {
  value: string;
  options: ComboOption[];
  placeholder?: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<ComboOption>;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await onCreate(name.trim());
      onChange(created.id);
      setAdding(false);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  };

  if (adding) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            value={name}
            placeholder="New name"
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-9 rounded-xl border-border text-sm"
          />
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={busy}
            className="h-9 w-9 rounded-lg bg-primary text-white shrink-0"
            aria-label="Save new"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              setAdding(false);
              setName("");
              setError("");
            }}
            disabled={busy}
            className="h-9 w-9 rounded-lg shrink-0"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {error && <span className="text-[11px] text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={value} onValueChange={(v) => v && onChange(v)} disabled={disabled}>
        <SelectTrigger className={triggerClassName ?? "rounded-xl border-border h-9 w-full"}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border">
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setAdding(true)}
        disabled={disabled}
        className="h-9 w-9 rounded-lg shrink-0"
        aria-label="Add new"
        title="Add new"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
