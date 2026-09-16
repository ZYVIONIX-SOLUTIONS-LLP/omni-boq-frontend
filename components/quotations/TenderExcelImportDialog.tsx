"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, List, Hash } from "lucide-react";
import { parseTenderExcel, convertTenderRowsToQuotationItems, ParseTenderResult } from "@/app/lib/api/tenderExcelParser";
import { QuotationItem } from "@/app/lib/api/quotations";
import Swal from "sweetalert2";

interface TenderExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities?: any[];
  products?: any[];
  onImportItems: (items: QuotationItem[], activityMappings: Record<number, string>, replaceExisting: boolean) => void;
}

export function TenderExcelImportDialog({ open, onOpenChange, activities = [], products = [], onImportItems }: TenderExcelImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [parseResults, setParseResults] = useState<ParseTenderResult[]>([]);
  const [selectedSheetIdx, setSelectedSheetIdx] = useState<number>(0);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const results = parseTenderExcel(buffer);

      if (!results || results.length === 0 || results.every((r) => r.rows.length === 0)) {
        Swal.fire({
          icon: "warning",
          title: "No Data Found",
          text: "Could not find valid Tender BOQ columns (SL.NO, ITEM DESCRIPTION, UNIT, QTY) in this Excel sheet.",
        });
        setParseResults([]);
      } else {
        setParseResults(results);
        setSelectedSheetIdx(0);
      }
    } catch (err: any) {
      console.error("Tender Excel parse error:", err);
      Swal.fire({
        icon: "error",
        title: "Import Error",
        text: err?.message || "Failed to read Tender Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.",
      });
      setParseResults([]);
    } finally {
      setLoading(false);
    }
  };

  const currentSheetResult = parseResults[selectedSheetIdx];

  const handleConfirmImport = () => {
    if (!currentSheetResult || currentSheetResult.rows.length === 0) return;

    const { items, activityMappings } = convertTenderRowsToQuotationItems(
      currentSheetResult.rows,
      0,
      activities,
      products
    );
    
    onImportItems(items, activityMappings, importMode === "replace");

    Swal.fire({
      icon: "success",
      title: "Tender Imported Successfully!",
      text: `Imported ${currentSheetResult.totalHeadingsCount} section headings and ${currentSheetResult.totalItemsCount} BOQ items from ${currentSheetResult.sheetName}.`,
      timer: 2000,
      showConfirmButton: false,
    });

    onOpenChange(false);
    // Reset state
    setParseResults([]);
    setFileName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-white border border-purple-200 rounded-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Import Tender BOQ Excel / CSV
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Upload your Tender BOQ file (SL.NO, ITEM DESCRIPTION, UNIT, QTY, RATE) to automatically build the Quotation table.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-130px)] space-y-5">
          {/* File Upload Drop Zone */}
          <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 transition-colors p-6 text-center cursor-pointer relative group">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {fileName ? fileName : "Click or Drag & Drop Tender Excel / CSV File"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supports .xlsx, .xls, and .csv format with SL.NO, Description, Unit, and Qty columns
                </p>
              </div>
            </div>
          </div>

          {/* Sample Template Download Helper */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-none">
            <span className="text-xs text-slate-600 font-medium">Need a sample format matching your tender images?</span>
            <a
              href="/sample_tender_boq.xlsx"
              download="sample_tender_boq.xlsx"
              className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1.5 underline bg-purple-50 px-2.5 py-1 rounded border border-purple-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-700" />
              Download Sample Tender Excel (.xlsx)
            </a>
          </div>

          {loading && (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Parsing Tender BOQ file...</p>
            </div>
          )}

          {/* Parsed Preview Section */}
          {!loading && parseResults.length > 0 && currentSheetResult && (
            <div className="space-y-4">
              {/* Sheet selector & summary stats */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-50/60 border border-purple-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-900 uppercase">Select Sheet:</span>
                  <select
                    value={selectedSheetIdx}
                    onChange={(e) => setSelectedSheetIdx(Number(e.target.value))}
                    className="h-8 text-xs font-semibold bg-white border border-purple-300 rounded px-2 text-slate-800 focus:outline-none"
                  >
                    {parseResults.map((res, idx) => (
                      <option key={idx} value={idx}>
                        {res.sheetName} ({res.rows.length} rows)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Headings: <strong>{currentSheetResult.totalHeadingsCount}</strong>
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                    BOQ Items: <strong>{currentSheetResult.totalItemsCount}</strong>
                  </span>
                </div>
              </div>

              {/* Import Mode Radio Options */}
              <div className="flex items-center gap-6 bg-slate-50 p-3 border border-slate-200 text-xs font-semibold">
                <span className="text-slate-700">Import Mode:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                    className="accent-purple-600"
                  />
                  Append to current quotation items
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="accent-purple-600"
                  />
                  Replace all existing items in quotation
                </label>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-16 text-center border-r border-slate-200">SL NO</th>
                      <th className="p-2 border-r border-slate-200">ITEM DESCRIPTION</th>
                      <th className="p-2 w-20 text-center border-r border-slate-200">UNIT</th>
                      <th className="p-2 w-24 text-right border-r border-slate-200">QTY</th>
                      <th className="p-2 w-28 text-right">RATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentSheetResult.rows.slice(0, 100).map((row, idx) => {
                      if (row.isHeading) {
                        return (
                          <tr key={idx} className="bg-purple-100/70 font-bold text-purple-950">
                            <td className="p-2 text-center border-r border-purple-200">{row.serialNumber || "—"}</td>
                            <td className="p-2 border-r border-purple-200" colSpan={4}>
                              <span dangerouslySetInnerHTML={{ __html: row.description }} />
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={idx} className="hover:bg-slate-50 text-slate-800">
                          <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-100">
                            {row.serialNumber || idx + 1}
                          </td>
                          <td className="p-2 border-r border-slate-100 font-medium">
                            {row.description}
                          </td>
                          <td className="p-2 text-center border-r border-slate-100 font-semibold text-slate-600">
                            {row.unit || "Nos"}
                          </td>
                          <td className="p-2 text-right border-r border-slate-100 font-bold text-emerald-700">
                            {row.quantity}
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-700">
                            {row.rate > 0 ? `${row.rate.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {currentSheetResult.rows.length > 100 && (
                  <p className="text-center text-xs text-slate-400 py-2 bg-slate-50 border-t border-slate-200 font-semibold">
                    + Showing first 100 of {currentSheetResult.rows.length} rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-none border-slate-300 h-9 text-xs font-semibold"
          >
            Cancel
          </Button>

          {currentSheetResult && currentSheetResult.rows.length > 0 && (
            <Button
              onClick={handleConfirmImport}
              className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-bold gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Import {currentSheetResult.rows.length} Rows to Quotation Table
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
