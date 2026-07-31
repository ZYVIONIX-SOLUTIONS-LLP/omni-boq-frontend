"use client";

import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileUp, Loader2, XCircle, Download, FileSpreadsheet } from "lucide-react";
import {
  categoriesApi,
  subCategoriesApi,
  manufacturersApi,
  attributeDefsApi,
  listProducts,
  saveProduct,
  ProductInput,
} from "@/app/lib/catalog/api";
import {
  CatalogCategory,
  SubCategory,
  Manufacturer,
  AttributeDef,
} from "@/app/lib/catalog/types";

interface MaterialImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface ParsedRow {
  index: number;
  data: any;
  isValid: boolean;
  errors: string[];
  productInput?: ProductInput;
}

export default function MaterialImportDialog({
  isOpen,
  onClose,
  onComplete,
}: MaterialImportDialogProps) {
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);
  const [existingProducts, setExistingProducts] = useState<any[]>([]);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadMetadata();
      setParsedRows([]);
      setUploading(false);
      setProgress(0);
    }
  }, [isOpen]);

  const loadMetadata = async () => {
    setLoadingMetadata(true);
    try {
      const [cats, subCats, mfrs, attrs, prods] = await Promise.all([
        categoriesApi.list({ limit: 1000 }),
        subCategoriesApi.list({ limit: 1000 }),
        manufacturersApi.list({ limit: 1000 }),
        attributeDefsApi.list({ limit: 1000 }),
        listProducts({ limit: 50000, scope: "global" }),
      ]);
      setCategories(cats.items);
      setSubCategories(subCats.items);
      setManufacturers(mfrs.items);
      setAttributeDefs(attrs.items);
      setExistingProducts(prods.items);
    } catch (err) {
      console.error("Failed to load metadata for import", err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const downloadTemplate = () => {
    const standardCols = [
      "Manufacturer",
      "Category",
      "SubCategory",
      "Series",
      "ModelCode",
      "Name",
      "Color",
      "Voltage Class",
      "MRP",
      "Discount %",
      "GST Rate",
      "Unit",
      "HSN",
    ];

    const dynamicCols = Array.from(new Set(attributeDefs.map((d) => d.name)));
    const allCols = [...standardCols, ...dynamicCols];

    const dummyRow: Record<string, any> = {
      Manufacturer: "Legrand",
      Category: "Switch",
      SubCategory: "",
      Series: "Myrius",
      ModelCode: "673001",
      Name: "1 Way Switch",
      Color: "White",
      "Voltage Class": "LV",
      MRP: 150,
      "Discount %": 50,
      "GST Rate": 18,
      Unit: "NOS",
      HSN: "8536",
    };

    // Add dummy values for specific well-known dynamic columns if they exist
    if (dynamicCols.includes("Module")) dummyRow["Module"] = 1;
    if (dynamicCols.includes("Ampere")) dummyRow["Ampere"] = 6;
    if (dynamicCols.includes("Way")) dummyRow["Way"] = 1;
    if (dynamicCols.includes("Indicator")) dummyRow["Indicator"] = "No";

    const ws = XLSX.utils.json_to_sheet([dummyRow], { header: allCols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Material_Import_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        validateData(data);
      } catch (err) {
        console.error("Error reading file", err);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = ""; // reset
  };

  const normalizeBoolean = (val: any): boolean | null => {
    if (typeof val === "boolean") return val;
    if (!val) return null;
    const s = String(val).toLowerCase().trim();
    if (["yes", "y", "true", "1"].includes(s)) return true;
    if (["no", "n", "false", "0"].includes(s)) return false;
    return null;
  };

  const validateData = (data: any[]) => {
    const rows: ParsedRow[] = data.map((row, index) => {
      const errors: string[] = [];
      
      const mfrName = String(row["Manufacturer"] || "").trim();
      const catName = String(row["Category"] || "").trim();
      const subCatName = String(row["SubCategory"] || "").trim();

      const mfr = manufacturers.find(
        (m) => m.name.toLowerCase() === mfrName.toLowerCase()
      );
      if (!mfr) errors.push(`Manufacturer '${mfrName}' not found`);

      const cat = categories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase()
      );
      if (!cat) errors.push(`Category '${catName}' not found`);

      let subCatId: string | undefined = undefined;
      if (cat && subCatName && subCatName !== "undefined" && subCatName !== "null") {
        const subCat = subCategories.find(
          (s) => s.name.toLowerCase() === subCatName.toLowerCase() && s.categoryId === cat.id
        );
        if (!subCat) {
          errors.push(`SubCategory '${subCatName}' not found under '${catName}'`);
        } else {
          subCatId = subCat.id;
        }
      }

      // Check Attributes
      const attributes: Record<string, any> = {};
      if (cat) {
        const catAttrDefs = attributeDefs.filter((d) => d.categoryId === cat.id);
        catAttrDefs.forEach((def) => {
          const rawVal = row[def.name];
          if (rawVal !== undefined && rawVal !== "") {
            if (def.type === "SELECT") {
              const matchedChoice = def.options?.find(
                (c) => c.toLowerCase() === String(rawVal).toLowerCase().trim()
              );
              if (!matchedChoice) {
                errors.push(`Invalid choice '${rawVal}' for '${def.name}'. Allowed: ${def.options?.join(", ")}`);
              } else {
                attributes[def.id] = matchedChoice;
              }
            } else if (def.type === "BOOLEAN") {
              const bVal = normalizeBoolean(rawVal);
              if (bVal === null) {
                errors.push(`Invalid boolean '${rawVal}' for '${def.name}'. Use Yes/No.`);
              } else {
                attributes[def.id] = bVal;
              }
            } else {
              attributes[def.id] = String(rawVal).trim();
            }
          } else if (def.required) {
            // NOTE: Enforcing required attributes if the attribute definition says so.
            errors.push(`Missing required specification: ${def.name}`);
          }
        });
      }

      const mrp = Number(row["MRP"]);
      if (isNaN(mrp) || mrp <= 0) errors.push(`Invalid MRP: ${row["MRP"]}`);

      const unit = String(row["Unit"] || "").trim() || "NOS";

      let productInput: ProductInput | undefined;

      if (errors.length === 0 && mfr && cat) {
        const series = String(row["Series"] || "").trim();
        const modelCode = String(row["ModelCode"] || "").trim();
        let name = String(row["Name"] || "").trim();
        const color = String(row["Color"] || "").trim();
        
        const voltageClassRaw = String(row["Voltage Class"] || "").trim();
        const voltageClass = ["LV", "MV", "HV", "EHV"].includes(voltageClassRaw) 
          ? (voltageClassRaw as "LV" | "MV" | "HV" | "EHV") 
          : null;

        if (!name) {
          const parts: string[] = [];
          if (mfr.name) parts.push(mfr.name);
          if (series) parts.push(series);
          if (cat.name) parts.push(cat.name);
          
          const catAttrDefs = attributeDefs.filter((d) => d.categoryId === cat.id);
          for (const def of catAttrDefs) {
             const val = attributes[def.id];
             if (val === undefined || val === null || val === "") continue;
             if (def.type === "BOOLEAN") {
               if (val === true) parts.push(def.name);
             } else if (def.type === "NUMBER") {
               parts.push(def.unit ? `${val}${def.unit}` : String(val));
             } else {
               parts.push(String(val));
             }
          }
          if (color) parts.push(color);
          name = parts.join(" ");
        }

        productInput = {
          manufacturerId: mfr.id,
          manufacturerName: mfr.name,
          categoryId: cat.id,
          categoryName: cat.name,
          subCategoryId: subCatId,
          subCategoryName: subCatName || undefined,
          series,
          modelCode,
          name,
          color,
          voltageClass,
          mrp,
          discountPercent: row["Discount %"] ? Number(row["Discount %"]) : undefined,
          gstRate: row["GST Rate"] ? Number(row["GST Rate"]) : undefined,
          unit,
          hsnCode: row["HSN"] ? String(row["HSN"]).trim() : undefined,
          attributes,
          images: { gallery: [] },
          status: "ACTIVE",
        };

        // Duplicate Check against existing products
        const isDuplicate = existingProducts.some(
          (ep) =>
            ep.manufacturerId === productInput!.manufacturerId &&
            ep.categoryId === productInput!.categoryId &&
            (ep.series || "") === (productInput!.series || "") &&
            (ep.modelCode || "") === (productInput!.modelCode || "") &&
            (ep.name || "") === (productInput!.name || "") &&
            (ep.color || "") === (productInput!.color || "") &&
            JSON.stringify(ep.attributes || {}) === JSON.stringify(productInput!.attributes || {})
        );

        if (isDuplicate) {
          errors.push(`Duplicate item: A matching product already exists.`);
        }
      }

      return {
        index: index + 2, // +1 for 0-index, +1 for header row
        data: row,
        isValid: errors.length === 0,
        errors,
        productInput,
      };
    });

    setParsedRows(rows);
  };

  const handleUpload = async () => {
    const validRows = parsedRows.filter((r) => r.isValid && r.productInput);
    if (validRows.length === 0) return;

    setUploading(true);
    setProgress(0);

    let successCount = 0;
    
    // Chunking to avoid overwhelming the server, run sequentially for safety
    for (let i = 0; i < validRows.length; i++) {
      try {
        await saveProduct(validRows[i].productInput!);
        successCount++;
      } catch (err) {
        console.error(`Failed to upload row ${validRows[i].index}`, err);
        validRows[i].isValid = false;
        validRows[i].errors.push("Failed to save to database");
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setUploading(false);
    onComplete();
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && !uploading && onClose()}>
      <DialogContent className="sm:max-w-[1000px] w-[95vw] bg-white h-[85vh] max-h-[800px] flex flex-col p-0 overflow-hidden font-sans rounded-xl border-0 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 text-white shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              Bulk Import Materials
            </DialogTitle>
            <DialogDescription className="text-emerald-100/80 text-sm mt-1">
              Upload an Excel or CSV file to import multiple products at once.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
          {loadingMetadata ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-500">Loading catalog data for validation...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
              
              {/* Controls */}
              {parsedRows.length === 0 && (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-white p-12 gap-6 h-full">
                  <div className="flex flex-col items-center text-center gap-2 max-w-md">
                    <FileUp className="h-12 w-12 text-slate-300" />
                    <h3 className="text-lg font-bold text-slate-700">Upload Data File</h3>
                    <p className="text-sm text-slate-500">
                      Ensure your columns match the catalog specifications. Use the template to get started.
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={downloadTemplate} className="gap-2 bg-white h-11">
                      <Download className="h-4 w-4" /> Download Template
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8">
                      <FileSpreadsheet className="h-4 w-4" /> Browse Excel / CSV
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              {parsedRows.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center shrink-0">
                    <h3 className="font-semibold text-slate-700">Preview Data</h3>
                    <div className="flex gap-4 text-sm font-medium">
                      <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {validCount} Valid</span>
                      <span className="text-red-600 flex items-center gap-1.5"><XCircle className="h-4 w-4" /> {invalidCount} Invalid</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-0 relative">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="px-4 py-2 text-xs font-semibold text-slate-500">Row</th>
                          <th className="px-4 py-2 text-xs font-semibold text-slate-500">Status</th>
                          <th className="px-4 py-2 text-xs font-semibold text-slate-500">Manufacturer</th>
                          <th className="px-4 py-2 text-xs font-semibold text-slate-500">Name / Spec</th>
                          <th className="px-4 py-2 text-xs font-semibold text-slate-500 w-1/3">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50 hover:bg-red-50'}>
                            <td className="px-4 py-2 text-slate-500">{r.index}</td>
                            <td className="px-4 py-2">
                              {r.isValid ? (
                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Ready</span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Skipped</span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-medium text-slate-700">{r.data["Manufacturer"]}</td>
                            <td className="px-4 py-2 text-slate-600">
                              <span className="font-semibold block">{r.data["Name"] || r.data["Category"]}</span>
                              <span className="text-xs text-slate-400">{r.data["Series"]} {r.data["ModelCode"] ? `• ${r.data["ModelCode"]}` : ''}</span>
                            </td>
                            <td className="px-4 py-2 text-xs text-red-600 font-medium">
                              {r.errors.map((e, idx) => <div key={idx} className="flex gap-1.5 items-start"><XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{e}</div>)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-slate-200 p-6">
          {uploading ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold text-slate-700">
                <span>Importing Materials...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="font-semibold text-slate-500"
              >
                Cancel
              </Button>
              {parsedRows.length > 0 && (
                <Button 
                  disabled={validCount === 0} 
                  onClick={handleUpload}
                  className="h-10 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                >
                  Import {validCount} Items
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
