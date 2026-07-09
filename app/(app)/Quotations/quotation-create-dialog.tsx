"use client";

import { useEffect, useState } from "react";

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

interface QuotationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (quotationId: string) => void;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
}: QuotationCreateDialogProps) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setProjectName("");
      setStartDate("");
      setEndDate("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async () => {
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
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      onCreated(quotation.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "rounded-xl border-border h-9";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">New Quotation</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter the client and project details to start a quotation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs font-bold text-foreground">Client</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client Name" required>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Rajesh Kumar" className={inputCls} />
            </Field>
            <Field label="Phone">
              <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="e.g. 9876543210" className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Address">
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Site address" className={inputCls} />
              </Field>
            </div>
          </div>

          <p className="text-xs font-bold text-foreground pt-1">Project</p>
          <Field label="Project Name" required>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Residential Villa Wiring - Kakkanad" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="End Date">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </Field>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="rounded-xl bg-primary text-white shadow-md shadow-primary/25" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
