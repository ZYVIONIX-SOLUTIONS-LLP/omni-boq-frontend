"use client";

// Quick-create: capture just enough (client + project) to open a draft
// quotation, then hand off to the desktop-style editor for the line items.

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
import { createQuotationWithClient } from "@/app/lib/api/quotations";

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

export default function QuotationCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (quotationId: string, mode: "manual" | "ai") => void;
}) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setClientName("");
    setClientPhone("");
    setClientAddress("");
    setProjectName("");
    setError("");
  };

  const submit = async (mode: "manual" | "ai") => {
    if (!clientName.trim() || !projectName.trim()) {
      setError("Client name and project name are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const quotation = await createQuotationWithClient({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        clientAddress: clientAddress.trim() || undefined,
        projectName: projectName.trim(),
      });
      reset();
      onOpenChange(false);
      onCreated(quotation.id, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quotation");
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
      <DialogContent className="max-w-md rounded-none border border-purple-200 bg-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">New Quotation</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Capture the client and project — you&apos;ll add line items next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Client Name" required>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. ABC Corp"
              className="rounded-none border-purple-200 h-10 text-xs font-semibold focus-visible:ring-purple-500"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="rounded-none border-purple-200 h-10 text-xs font-semibold focus-visible:ring-purple-500"
              />
            </Field>
            <Field label="Project Name" required>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Retail Store Wiring"
                className="rounded-none border-purple-200 h-10 text-xs font-semibold focus-visible:ring-purple-500"
              />
            </Field>
          </div>
          <Field label="Address">
            <Input
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              className="rounded-none border-purple-200 h-10 text-xs font-semibold focus-visible:ring-purple-500"
            />
          </Field>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
        <DialogFooter className="sm:justify-between items-center w-full">
          <Button
            variant="ghost"
            className="rounded-none px-2 text-slate-500 hover:text-slate-900"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-none border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold text-xs"
              onClick={() => submit("manual")}
              disabled={saving}
            >
              {saving ? "Creating..." : "Manual Entry"}
            </Button>
            <Button
              className="rounded-none bg-purple-700 hover:bg-purple-800 text-white shadow-md transition-all font-semibold text-xs"
              onClick={() => submit("ai")}
              disabled={saving}
            >
              {saving ? "Creating..." : "AI Workspace ✨"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
