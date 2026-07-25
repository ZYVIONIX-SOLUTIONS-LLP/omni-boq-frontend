"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createActivity, WiringType, ACTIVITY_CATEGORIES } from "@/app/lib/api/activities";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function ActivityCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (activityId: string) => void;
}) {
  const [name, setName] = useState("");
  const [wiringType, setWiringType] = useState<WiringType>("POINT_WIRING");
  const [category, setCategory] = useState(ACTIVITY_CATEGORIES.POINT_WIRING[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setWiringType("POINT_WIRING");
    setCategory(ACTIVITY_CATEGORIES.POINT_WIRING[0]);
    setError("");
  };

  const handleWiringTypeChange = (val: WiringType) => {
    setWiringType(val);
    setCategory(ACTIVITY_CATEGORIES[val][0]);
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Activity name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const activity = await createActivity({
        name: name.trim(),
        wiringType,
        category,
        requirements: [],
      });
      reset();
      onOpenChange(false);
      onCreated(activity.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create activity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">New Activity</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure the default parameters for this activity. You will add materials and rates in the spreadsheet editor next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select
                value={wiringType}
                onValueChange={(val) => val && handleWiringTypeChange(val as WiringType)}
              >
                <SelectTrigger className="rounded-xl border-border h-10 bg-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-border">
                  <SelectItem value="POINT_WIRING">Point Wiring</SelectItem>
                  <SelectItem value="CIRCUIT_WIRING">Circuit Wiring</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={category} onValueChange={(val) => val && setCategory(val)}>
                <SelectTrigger className="rounded-xl border-border h-10 bg-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-border">
                  {ACTIVITY_CATEGORIES[wiringType].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Activity Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. One Light controlled by 6A switch"
              className="rounded-xl border-border h-10 bg-white"
            />
          </Field>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-primary text-white hover:bg-primary/95"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Creating..." : "Create & Open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
