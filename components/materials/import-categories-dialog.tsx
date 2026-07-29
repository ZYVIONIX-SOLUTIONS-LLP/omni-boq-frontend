"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  commitImport,
  parseImportFile,
  validateImportRows,
  type CategoryImportSummary,
  type CategoryValidationResult,
} from "@/app/lib/catalog/bulkImportCategories";

type Step = "pick" | "validating" | "review" | "importing" | "done";

const MAX_ROWS_SHOWN = 50;

export default function ImportCategoriesDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [validation, setValidation] = useState<CategoryValidationResult | null>(null);
  const [summary, setSummary] = useState<CategoryImportSummary | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("pick");
    setFileName("");
    setValidation(null);
    setSummary(null);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStep("validating");
    setError("");
    try {
      const rows = await parseImportFile(file);
      if (rows.length === 0) {
        setError("That file has no data rows to import.");
        setStep("pick");
        return;
      }
      setValidation(await validateImportRows(rows));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file");
      setStep("pick");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirm = async () => {
    if (!validation) return;
    setStep("importing");
    setError("");
    try {
      const rawRows = validation.rows.map((r) => r.raw);
      const result = await commitImport(rawRows);
      setSummary(result);
      setStep("done");
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("review");
    }
  };

  const flaggedRows = validation?.rows.filter((r) => r.status !== "ready") ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Import Categories &amp; Specifications</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            One row per (Category, Specification) pair: Category Name, HSN Code, Default GST %,
            Specification Name, Specification Type (Text/Number/Select/Boolean), Unit, Options
            (semicolon-separated, Select only), Required (Yes/No). Leave the specification columns
            blank on a row to just create the category.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        {step === "pick" && (
          <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-3">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Choose an .xlsx, .xls, or .csv file with the Category + Specification columns.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="import-categories-file-input"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-primary text-white hover:bg-primary/95"
            >
              Choose File
            </Button>
          </div>
        )}

        {step === "validating" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Reading {fileName}...</p>
          </div>
        )}

        {step === "review" && validation && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-emerald-700">{validation.readyCount}</p>
                <p className="text-[11px] font-semibold text-emerald-700/80">Ready</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-amber-700">{validation.warningCount}</p>
                <p className="text-[11px] font-semibold text-amber-700/80">Warnings</p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-red-700">{validation.errorCount}</p>
                <p className="text-[11px] font-semibold text-red-700/80">Errors (skipped)</p>
              </div>
            </div>

            {validation.newCategories.length > 0 && (
              <div className="rounded-xl border border-border p-3 space-y-1.5 bg-slate-50/50">
                <p className="text-xs font-bold text-foreground">Will be created as new:</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Categories:</span>{" "}
                  {validation.newCategories.join(", ")}
                </p>
              </div>
            )}

            {flaggedRows.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {flaggedRows.slice(0, MAX_ROWS_SHOWN).map((row) => (
                    <div key={row.raw.rowNumber} className="px-3 py-2 flex items-start gap-2">
                      {row.status === "error" ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          Row {row.raw.rowNumber}
                          {row.raw.categoryName && (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              — {row.raw.categoryName}
                              {row.raw.specName && ` / ${row.raw.specName}`}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{row.messages.join("; ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {flaggedRows.length > MAX_ROWS_SHOWN && (
                  <p className="text-[11px] text-muted-foreground text-center py-2 bg-slate-50/50">
                    +{flaggedRows.length - MAX_ROWS_SHOWN} more flagged rows
                  </p>
                )}
              </div>
            )}

            {validation.readyCount === 0 && validation.errorCount === validation.rows.length && (
              <p className="text-xs text-red-600">
                Every row has an error — nothing would be imported. Fix the file and try again.
              </p>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Importing...</p>
          </div>
        )}

        {step === "done" && summary && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-bold">Import complete</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p><span className="font-semibold">{summary.categoriesCreated}</span> categories created</p>
              <p><span className="font-semibold">{summary.categoriesUpdated}</span> categories updated</p>
              <p><span className="font-semibold">{summary.specsCreated}</span> specifications created</p>
              <p><span className="font-semibold">{summary.specsSkippedExisting}</span> specs already existed (skipped)</p>
              <p><span className="font-semibold">{summary.rowsSkipped}</span> rows skipped (errors)</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "review" && (
            <>
              <Button variant="outline" className="rounded-xl" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={validation?.readyCount === 0 && validation?.warningCount === 0}
                className="rounded-xl bg-primary text-white hover:bg-primary/95"
              >
                Confirm Import
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose} className="rounded-xl bg-primary text-white hover:bg-primary/95">
              Done
            </Button>
          )}
          {(step === "pick" || step === "validating") && (
            <Button variant="outline" className="rounded-xl" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
