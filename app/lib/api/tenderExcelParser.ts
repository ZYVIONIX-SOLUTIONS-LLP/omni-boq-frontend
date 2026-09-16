// // import * as XLSX from "xlsx";
// // import { QuotationItem } from "./quotations";

// // export interface ParsedTenderRow {
// //   isHeading: boolean;
// //   serialNumber: string;
// //   description: string;
// //   unit: string;
// //   quantity: number;
// //   rate: number;
// // }

// // export interface ParseTenderResult {
// //   sheetName: string;
// //   rows: ParsedTenderRow[];
// //   totalItemsCount: number;
// //   totalHeadingsCount: number;
// // }

// // /**
// //  * Parses a Tender BOQ Excel or CSV file.
// //  * Automatically identifies columns for SL.NO, ITEM DESCRIPTION, UNIT, QTY, and RATE.
// //  */
// // export function parseTenderExcel(arrayBuffer: ArrayBuffer): ParseTenderResult[] {
// //   const workbook = XLSX.read(arrayBuffer, { type: "array" });
// //   const results: ParseTenderResult[] = [];

// //   for (const sheetName of workbook.SheetNames) {
// //     const worksheet = workbook.Sheets[sheetName];
// //     if (!worksheet) continue;

// //     // Convert sheet to 2D array of raw values
// //     const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
// //     if (!rawRows || rawRows.length === 0) continue;

// //     // Step 1: Locate header row by searching for keywords
// //     let headerRowIdx = -1;
// //     let slColIdx = -1;
// //     let descColIdx = -1;
// //     let unitColIdx = -1;
// //     let qtyColIdx = -1;
// //     let rateColIdx = -1;

// //     for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
// //       const row = rawRows[r];
// //       if (!Array.isArray(row)) continue;

// //       let foundDesc = -1;
// //       let foundSl = -1;
// //       let foundUnit = -1;
// //       let foundQty = -1;
// //       let foundRate = -1;

// //       for (let c = 0; c < row.length; c++) {
// //         const val = String(row[c] || "").trim().toUpperCase();
// //         if (!val) continue;

// //         if (
// //           val === "SL.NO" ||
// //           val === "SL. NO" ||
// //           val === "SL NO" ||
// //           val === "S.NO" ||
// //           val === "S. NO" ||
// //           val === "S NO" ||
// //           val === "ITEM NO" ||
// //           val === "ITEM NO." ||
// //           val === "SR.NO" ||
// //           val === "NO" ||
// //           val === "NO." ||
// //           val === "SL.NO."
// //         ) {
// //           foundSl = c;
// //         } else if (
// //           val.includes("ITEM DESCRIPTION") ||
// //           val.includes("PARTICULARS") ||
// //           val.includes("DESCRIPTION") ||
// //           val.includes("ITEM NAME") ||
// //           val === "ITEMS"
// //         ) {
// //           foundDesc = c;
// //         } else if (val === "UNIT" || val === "UOM" || val === "UNITS") {
// //           foundUnit = c;
// //         } else if (
// //           val === "QTY" ||
// //           val === "QUANTITY" ||
// //           val === "QTY." ||
// //           val === "QTY (NOS)" ||
// //           val === "BOQ QTY"
// //         ) {
// //           foundQty = c;
// //         } else if (
// //           val === "RATE" ||
// //           val === "UNIT RATE" ||
// //           val === "PRICE" ||
// //           val === "UNIT PRICE" ||
// //           val === "ESTIMATED RATE"
// //         ) {
// //           foundRate = c;
// //         }
// //       }

// //       if (foundDesc !== -1 && (foundQty !== -1 || foundUnit !== -1 || foundSl !== -1)) {
// //         headerRowIdx = r;
// //         slColIdx = foundSl;
// //         descColIdx = foundDesc;
// //         unitColIdx = foundUnit;
// //         qtyColIdx = foundQty;
// //         rateColIdx = foundRate;
// //         break;
// //       }
// //     }

// //     // Fallback column positions if explicit header row wasn't unambiguously found
// //     if (headerRowIdx === -1) {
// //       headerRowIdx = 0;
// //       slColIdx = 0;
// //       descColIdx = 1;
// //       unitColIdx = 2;
// //       qtyColIdx = 3;
// //       rateColIdx = 4;
// //     }

// //     const parsedRows: ParsedTenderRow[] = [];
// //     let itemsCount = 0;
// //     let headingsCount = 0;

// //     // Step 2: Parse data rows below header row
// //     for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
// //       const row = rawRows[r];
// //       if (!Array.isArray(row)) continue;

// //       const rawSl = slColIdx !== -1 ? String(row[slColIdx] || "").trim() : "";
// //       const rawDesc = descColIdx !== -1 ? String(row[descColIdx] || "").trim() : "";
// //       const rawUnit = unitColIdx !== -1 ? String(row[unitColIdx] || "").trim() : "";
// //       const rawQty = qtyColIdx !== -1 ? String(row[qtyColIdx] || "").trim() : "";
// //       const rawRate = rateColIdx !== -1 ? String(row[rateColIdx] || "").trim() : "";

// //       // Skip completely empty rows
// //       if (!rawSl && !rawDesc && !rawUnit && !rawQty && !rawRate) continue;

// //       // Clean up description HTML or multiline text
// //       const cleanDesc = rawDesc.replace(/[\r\n]+/g, " ").trim();
// //       if (!cleanDesc) continue;

// //       // Determine if row is a Section Heading or an Item Row
// //       const hasUnit = rawUnit.length > 0;
// //       const isQtyNumeric = /^\d+(\.\d+)?$/.test(rawQty.replace(/,/g, ""));
// //       const isRo = rawQty.toUpperCase().startsWith("RO");

// //       // Heuristic: If there is no unit and no numeric quantity, OR if it's a major section code like "29", "29.1", "39", "D", "SUMMARY OF C"
// //       const isHeading =
// //         (!hasUnit && !isQtyNumeric && !isRo) ||
// //         cleanDesc.toUpperCase().startsWith("SUMMARY OF") ||
// //         cleanDesc.toUpperCase().startsWith("WIRING FOR") ||
// //         cleanDesc.toUpperCase().startsWith("DISTRIBUTION BOARDS") ||
// //         cleanDesc.toUpperCase().startsWith("POINT WIRING");

// //       let numericQty = 0;
// //       if (isQtyNumeric) {
// //         numericQty = parseFloat(rawQty.replace(/,/g, ""));
// //       } else if (isRo) {
// //         numericQty = 1; // Rate Only defaults to 1 or 0
// //       }

// //       let numericRate = 0;
// //       if (/^\d+(\.\d+)?$/.test(rawRate.replace(/,/g, ""))) {
// //         numericRate = parseFloat(rawRate.replace(/,/g, ""));
// //       }

// //       if (isHeading) {
// //         headingsCount++;
// //         parsedRows.push({
// //           isHeading: true,
// //           serialNumber: rawSl,
// //           description: `<strong>${cleanDesc}</strong>`,
// //           unit: "",
// //           quantity: 0,
// //           rate: 0,
// //         });
// //       } else {
// //         itemsCount++;
// //         parsedRows.push({
// //           isHeading: false,
// //           serialNumber: rawSl,
// //           description: cleanDesc,
// //           unit: rawUnit || "Nos",
// //           quantity: numericQty,
// //           rate: numericRate,
// //         });
// //       }
// //     }

// //     if (parsedRows.length > 0) {
// //       results.push({
// //         sheetName,
// //         rows: parsedRows,
// //         totalItemsCount: itemsCount,
// //         totalHeadingsCount: headingsCount,
// //       });
// //     }
// //   }

// //   return results;
// // }

// // /**
// //  * Helper to strip HTML tags and normalize strings for matching.
// //  */
// // function normalizeString(str: string): string {
// //   const plain = str.replace(/<[^>]*>/g, "").toLowerCase().trim();
// //   return plain.replace(/[^a-z0-9]/g, "");
// // }

// // /**
// //  * Converts ParsedTenderRow array into QuotationItem array.
// //  * Automatically matches items against database Activities and Materials by name/code.
// //  */
// // export function convertTenderRowsToQuotationItems(
// //   rows: ParsedTenderRow[],
// //   startSortOrder: number = 0,
// //   activities: any[] = [],
// //   products: any[] = []
// // ): { items: QuotationItem[]; activityMappings: Record<number, string> } {
// //   const activityMappings: Record<number, string> = {};

// //   const items = rows.map((row, idx) => {
// //     const isHeading = row.isHeading;
// //     const globalIdx = startSortOrder + idx;

// //     if (isHeading) {
// //       return {
// //         id: `tender-item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
// //         description: row.description,
// //         unit: "",
// //         quantity: 0,
// //         rate: 0,
// //         discountPct: 0,
// //         profitPct: 0,
// //         taxRate: 0,
// //         amount: 0,
// //         sortOrder: globalIdx,
// //         snapshotData: {
// //           isHeading: true,
// //           serialNumber: row.serialNumber,
// //           isTenderImported: true,
// //         },
// //       };
// //     }

// //     const normDesc = normalizeString(row.description);
// //     let matchedActivity: any = null;
// //     let matchedProduct: any = null;

// //     // 1. Try to match against database Activities
// //     if (normDesc && activities.length > 0) {
// //       matchedActivity = activities.find((act) => {
// //         const actNormName = normalizeString(act.name || "");
// //         const actNormCode = normalizeString(act.code || "");
// //         return (
// //           actNormName === normDesc ||
// //           actNormCode === normDesc ||
// //           (actNormName.length > 4 && normDesc.includes(actNormName)) ||
// //           (normDesc.length > 4 && actNormName.includes(normDesc))
// //         );
// //       });
// //     }

// //     // 2. If no Activity matched, try to match against database Materials (Products)
// //     if (!matchedActivity && normDesc && products.length > 0) {
// //       matchedProduct = products.find((prod) => {
// //         const prodName = normalizeString(prod.name || "");
// //         const prodCode = normalizeString(prod.modelCode || "");
// //         return (
// //           (prodName.length > 3 && (prodName === normDesc || normDesc.includes(prodName))) ||
// //           (prodCode.length > 3 && (prodCode === normDesc || normDesc.includes(prodCode)))
// //         );
// //       });
// //     }

// //     let itemRate = row.rate;
// //     let materialRate = row.rate;
// //     let labourRate = 0;
// //     let snapshotData: any = {
// //       isHeading: false,
// //       serialNumber: row.serialNumber,
// //       isTenderImported: true,
// //     };

// //     if (matchedActivity) {
// //       const matCost = Number(matchedActivity.materialCost) || 0;
// //       const labCost = Number(matchedActivity.labourCost) || 0;
// //       const actRate = matCost + labCost;

// //       // Map activity to this row index
// //       activityMappings[globalIdx] = matchedActivity.id;

// //       itemRate = itemRate > 0 ? itemRate : actRate > 0 ? actRate : 0;
// //       materialRate = matCost;
// //       labourRate = labCost;

// //       snapshotData = {
// //         ...snapshotData,
// //         activityId: matchedActivity.id,
// //         activityName: matchedActivity.name,
// //         materialRate: matCost,
// //         labourRate: labCost,
// //       };
// //     } else if (matchedProduct) {
// //       const mrp = Number(matchedProduct.mrp) || 0;
// //       itemRate = itemRate > 0 ? itemRate : mrp;
// //       materialRate = mrp;

// //       snapshotData = {
// //         ...snapshotData,
// //         productId: matchedProduct.id,
// //         productName: matchedProduct.name || matchedProduct.modelCode,
// //         materialRate: mrp,
// //         labourRate: 0,
// //       };
// //     }

// //     const qty = row.quantity;
// //     const calcAmount = qty * itemRate;

// //     return {
// //       id: `tender-item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
// //       description: row.description,
// //       unit: row.unit || "Nos",
// //       quantity: qty,
// //       rate: itemRate,
// //       discountPct: 0,
// //       profitPct: 0,
// //       taxRate: 0,
// //       amount: calcAmount,
// //       sortOrder: globalIdx,
// //       snapshotData,
// //     };
// //   });

// //   return { items, activityMappings };
// // }


































// import * as XLSX from "xlsx";
// import { QuotationItem } from "./quotations";

// export interface ParsedTenderRow {
//   isHeading: boolean;
//   serialNumber: string;
//   description: string;
//   unit: string;
//   quantity: number;
//   rate: number;
// }

// export interface ParseTenderResult {
//   sheetName: string;
//   rows: ParsedTenderRow[];
//   totalItemsCount: number;
//   totalHeadingsCount: number;
// }

// /* ============================================================
//  * TEXT / VALUE HELPERS
//  * ============================================================ */

// function cleanText(value: unknown): string {
//   if (value === null || value === undefined) return "";

//   return String(value)
//     .replace(/\u00a0/g, " ")
//     .replace(/\r\n/g, " ")
//     .replace(/\r/g, " ")
//     .replace(/\n/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// /**
//  * Normalizes header text.
//  *
//  * Examples:
//  * "ITEM DESCRIPTION" -> "itemdescription"
//  * "Item-Description" -> "itemdescription"
//  * "Qty. (Nos)"       -> "qtynos"
//  */
// function normalizeHeader(value: unknown): string {
//   return cleanText(value)
//     .toLowerCase()
//     .replace(/&/g, "and")
//     .replace(/[^a-z0-9]+/g, "");
// }

// /**
//  * Normalizes text for Activity / Product matching.
//  */
// function normalizeString(str: string): string {
//   const plain = str.replace(/<[^>]*>/g, "").toLowerCase().trim();

//   return plain
//     .replace(/\u00a0/g, " ")
//     .replace(/[^a-z0-9]/g, "");
// }

// /**
//  * Get the displayed Excel value if available.
//  *
//  * This is important for serial numbers such as:
//  * 1.0
//  * 1.1
//  * 1.2.8
//  *
//  * If Excel stores 1.0 as a number but the cell formatting
//  * displays it as 1.0, cell.w will normally contain "1.0".
//  */
// function getCellValue(
//   worksheet: XLSX.WorkSheet,
//   rowIndex: number,
//   colIndex: number,
//   fallbackValue: unknown
// ): string {
//   try {
//     const address = XLSX.utils.encode_cell({
//       r: rowIndex,
//       c: colIndex,
//     });

//     const cell = worksheet[address];

//     if (cell && typeof cell.w === "string" && cell.w.trim() !== "") {
//       return cleanText(cell.w);
//     }
//   } catch {
//     // Ignore and use fallback value.
//   }

//   return cleanText(fallbackValue);
// }

// /**
//  * Convert arbitrary value into a number.
//  *
//  * Supports:
//  * 100
//  * 100.50
//  * 1,000
//  * ₹1,250
//  * 1,250.50
//  */
// function parseNumericValue(value: unknown): number {
//   const text = cleanText(value);

//   if (!text) return 0;

//   const normalized = text
//     .replace(/₹/gi, "")
//     .replace(/rs\.?/gi, "")
//     .replace(/,/g, "")
//     .replace(/\s/g, "");

//   const match = normalized.match(/-?\d+(?:\.\d+)?/);

//   if (!match) return 0;

//   const number = Number(match[0]);

//   return Number.isFinite(number) ? number : 0;
// }

// /**
//  * Quantity parser.
//  *
//  * Supports:
//  * 10
//  * 10.5
//  * 1,000
//  * 100 Nos
//  * RO
//  * R/O
//  * RATE ONLY
//  */
// function parseQuantity(value: unknown): {
//   quantity: number;
//   isRateOnly: boolean;
//   isNumeric: boolean;
// } {
//   const text = cleanText(value);

//   if (!text) {
//     return {
//       quantity: 0,
//       isRateOnly: false,
//       isNumeric: false,
//     };
//   }

//   const upper = text.toUpperCase();

//   const isRateOnly =
//     upper === "RO" ||
//     upper === "R/O" ||
//     upper === "RATE ONLY" ||
//     upper === "RATE-ONLY" ||
//     upper === "RATEONLY";

//   if (isRateOnly) {
//     return {
//       quantity: 1,
//       isRateOnly: true,
//       isNumeric: false,
//     };
//   }

//   const number = parseNumericValue(text);

//   const numericPattern =
//     /^-?\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[A-Za-z]+)?$/;

//   const isNumeric =
//     numericPattern.test(text) ||
//     /^-?\d+(?:\.\d+)?$/.test(text.replace(/,/g, ""));

//   return {
//     quantity: number,
//     isRateOnly: false,
//     isNumeric,
//   };
// }

// /* ============================================================
//  * HEADER DETECTION
//  * ============================================================ */

// const SERIAL_HEADERS = new Set([
//   "slno",
//   "sl",
//   "slno.",
//   "sl.number",
//   "sl.no",
//   "serialno",
//   "serialnumber",
//   "srno",
//   "srnumber",
//   "sr.no",
//   "sno",
//   "s.no",
//   "itemno",
//   "itemnumber",
//   "itemno.",
//   "itemnumber.",
//   "number",
//   "no",
//   "no.",
//   "code",
//   "itemcode",
//   "itemid",
// ]);

// const DESCRIPTION_HEADERS = new Set([
//   "description",
//   "itemdescription",
//   "itemdesc",
//   "item",
//   "items",
//   "itemname",
//   "product",
//   "productname",
//   "particular",
//   "particulars",
//   "details",
//   "detail",
//   "workdescription",
//   "workdesc",
//   "material",
//   "materialdescription",
//   "materialdesc",
//   "scopeofwork",
//   "scope",
//   "name",
//   "boqitem",
//   "boqdescription",
//   "descriptionofwork",
//   "descriptionofitem",
// ]);

// const UNIT_HEADERS = new Set([
//   "unit",
//   "units",
//   "uom",
//   "unitofmeasure",
//   "unitofmeasurement",
//   "measurement",
//   "measure",
//   "measuringunit",
// ]);

// const QTY_HEADERS = new Set([
//   "qty",
//   "qty.",
//   "quantity",
//   "quantities",
//   "qtynos",
//   "qtynos.",
//   "boqqty",
//   "boqquantity",
//   "requiredqty",
//   "requiredquantity",
//   "orderqty",
//   "orderquantity",
//   "totalqty",
//   "totalquantity",
//   "nos",
//   "noofitems",
//   "numberofitems",
//   "count",
// ]);

// const RATE_HEADERS = new Set([
//   "rate",
//   "unitrate",
//   "unitprice",
//   "price",
//   "cost",
//   "unitcost",
//   "estimatedrate",
//   "estimatedprice",
//   "basicrate",
//   "basicprice",
//   "quotedrate",
//   "quotedprice",
//   "sellingrate",
//   "sellingprice",
// ]);

// const AMOUNT_HEADERS = new Set([
//   "amount",
//   "totalamount",
//   "value",
//   "totalvalue",
//   "estimatedamount",
//   "totalcost",
//   "costamount",
// ]);

// function matchesHeader(
//   normalized: string,
//   type:
//     | "serial"
//     | "description"
//     | "unit"
//     | "qty"
//     | "rate"
//     | "amount"
// ): boolean {
//   if (!normalized) return false;

//   let set: Set<string>;

//   switch (type) {
//     case "serial":
//       set = SERIAL_HEADERS;
//       break;

//     case "description":
//       set = DESCRIPTION_HEADERS;
//       break;

//     case "unit":
//       set = UNIT_HEADERS;
//       break;

//     case "qty":
//       set = QTY_HEADERS;
//       break;

//     case "rate":
//       set = RATE_HEADERS;
//       break;

//     case "amount":
//       set = AMOUNT_HEADERS;
//       break;
//   }

//   if (set.has(normalized)) return true;

//   /*
//    * Additional flexible matching.
//    */

//   if (
//     type === "description" &&
//     (normalized.includes("description") ||
//       normalized.includes("particular") ||
//       normalized.includes("itemname") ||
//       normalized.includes("productname") ||
//       normalized.includes("workdescription"))
//   ) {
//     return true;
//   }

//   if (
//     type === "qty" &&
//     (normalized === "qnty" ||
//       normalized === "qnty." ||
//       normalized.includes("quantity") ||
//       normalized.startsWith("qty"))
//   ) {
//     return true;
//   }

//   if (
//     type === "unit" &&
//     (normalized.includes("unit") ||
//       normalized.includes("uom") ||
//       normalized.includes("measurement"))
//   ) {
//     return true;
//   }

//   if (
//     type === "rate" &&
//     (normalized.includes("rate") ||
//       normalized.includes("price") ||
//       normalized.includes("unitcost"))
//   ) {
//     return true;
//   }

//   if (
//     type === "serial" &&
//     (normalized.includes("serial") ||
//       normalized === "sno" ||
//       normalized === "srno" ||
//       normalized === "slno" ||
//       normalized.includes("itemno"))
//   ) {
//     return true;
//   }

//   return false;
// }

// interface HeaderDetectionResult {
//   headerRowIdx: number;
//   slColIdx: number;
//   descColIdx: number;
//   unitColIdx: number;
//   qtyColIdx: number;
//   rateColIdx: number;
//   amountColIdx: number;
//   confidence: number;
// }

// /**
//  * Finds the BOQ header anywhere in the worksheet.
//  *
//  * The old parser only checked the first 25 rows.
//  * This version scans the whole used range.
//  */
// function detectHeaderRow(
//   worksheet: XLSX.WorkSheet,
//   rawRows: any[][]
// ): HeaderDetectionResult {
//   let best: HeaderDetectionResult = {
//     headerRowIdx: -1,
//     slColIdx: -1,
//     descColIdx: -1,
//     unitColIdx: -1,
//     qtyColIdx: -1,
//     rateColIdx: -1,
//     amountColIdx: -1,
//     confidence: 0,
//   };

//   for (let r = 0; r < rawRows.length; r++) {
//     const row = rawRows[r];

//     if (!Array.isArray(row) || row.length === 0) continue;

//     let foundSl = -1;
//     let foundDesc = -1;
//     let foundUnit = -1;
//     let foundQty = -1;
//     let foundRate = -1;
//     let foundAmount = -1;

//     let score = 0;

//     for (let c = 0; c < row.length; c++) {
//       const rawValue = getCellValue(worksheet, r, c, row[c]);

//       if (!rawValue) continue;

//       const normalized = normalizeHeader(rawValue);

//       if (foundSl === -1 && matchesHeader(normalized, "serial")) {
//         foundSl = c;
//         score += 2;
//         continue;
//       }

//       if (
//         foundDesc === -1 &&
//         matchesHeader(normalized, "description")
//       ) {
//         foundDesc = c;
//         score += 5;
//         continue;
//       }

//       if (foundUnit === -1 && matchesHeader(normalized, "unit")) {
//         foundUnit = c;
//         score += 2;
//         continue;
//       }

//       if (foundQty === -1 && matchesHeader(normalized, "qty")) {
//         foundQty = c;
//         score += 4;
//         continue;
//       }

//       if (foundRate === -1 && matchesHeader(normalized, "rate")) {
//         foundRate = c;
//         score += 2;
//         continue;
//       }

//       if (foundAmount === -1 && matchesHeader(normalized, "amount")) {
//         foundAmount = c;
//         score += 1;
//         continue;
//       }
//     }

//     /*
//      * Strong header:
//      *
//      * Description + Qty
//      *
//      * OR
//      *
//      * Description + Unit
//      *
//      * OR
//      *
//      * Description + Serial
//      *
//      * OR
//      *
//      * Description + Rate
//      */
//     const hasDescription = foundDesc !== -1;

//     const hasSupportingColumn =
//       foundQty !== -1 ||
//       foundUnit !== -1 ||
//       foundSl !== -1 ||
//       foundRate !== -1;

//     if (!hasDescription || !hasSupportingColumn) {
//       continue;
//     }

//     /*
//      * Prefer headers that contain more BOQ-related columns.
//      */
//     if (foundQty !== -1) score += 3;
//     if (foundUnit !== -1) score += 2;
//     if (foundSl !== -1) score += 2;
//     if (foundRate !== -1) score += 2;

//     /*
//      * Give a small preference to earlier header rows when
//      * scores are equal.
//      */
//     const adjustedScore = score - r * 0.0001;

//     if (adjustedScore > best.confidence) {
//       best = {
//         headerRowIdx: r,
//         slColIdx: foundSl,
//         descColIdx: foundDesc,
//         unitColIdx: foundUnit,
//         qtyColIdx: foundQty,
//         rateColIdx: foundRate,
//         amountColIdx: foundAmount,
//         confidence: adjustedScore,
//       };
//     }
//   }

//   /*
//    * If no recognizable header was found, use the first
//    * meaningful row as a positional fallback.
//    */
//   if (best.headerRowIdx === -1) {
//     let firstMeaningfulRow = 0;

//     for (let r = 0; r < rawRows.length; r++) {
//       const row = rawRows[r];

//       if (!Array.isArray(row)) continue;

//       const hasValue = row.some(
//         (value) => cleanText(value).length > 0
//       );

//       if (hasValue) {
//         firstMeaningfulRow = r;
//         break;
//       }
//     }

//     const firstRow = rawRows[firstMeaningfulRow] || [];

//     /*
//      * Try to determine likely columns from the first meaningful row.
//      * If it looks like a normal BOQ header, use it.
//      * Otherwise use conventional BOQ positions.
//      */
//     let descIdx = 1;
//     let unitIdx = 2;
//     let qtyIdx = 3;
//     let rateIdx = 4;
//     let slIdx = 0;

//     for (let c = 0; c < firstRow.length; c++) {
//       const value = getCellValue(
//         worksheet,
//         firstMeaningfulRow,
//         c,
//         firstRow[c]
//       );

//       const normalized = normalizeHeader(value);

//       if (matchesHeader(normalized, "serial")) {
//         slIdx = c;
//       }

//       if (matchesHeader(normalized, "description")) {
//         descIdx = c;
//       }

//       if (matchesHeader(normalized, "unit")) {
//         unitIdx = c;
//       }

//       if (matchesHeader(normalized, "qty")) {
//         qtyIdx = c;
//       }

//       if (matchesHeader(normalized, "rate")) {
//         rateIdx = c;
//       }
//     }

//     best = {
//       headerRowIdx: firstMeaningfulRow,
//       slColIdx: slIdx,
//       descColIdx: descIdx,
//       unitColIdx: unitIdx,
//       qtyColIdx: qtyIdx,
//       rateColIdx: rateIdx,
//       amountColIdx: -1,
//       confidence: 0,
//     };
//   }

//   return best;
// }

// /* ============================================================
//  * HEADING / ITEM DETECTION
//  * ============================================================ */

// /**
//  * Determines whether a description looks like a section heading.
//  */
// function looksLikeKnownHeading(description: string): boolean {
//   const upper = cleanText(description).toUpperCase();

//   if (!upper) return false;

//   const headingPrefixes = [
//     "SUMMARY OF",
//     "WIRING FOR",
//     "DISTRIBUTION BOARDS",
//     "DISTRIBUTION BOARD",
//     "POINT WIRING",
//     "HT INSTALLATION",
//     "LT INSTALLATION",
//     "LV INSTALLATION",
//     "MV INSTALLATION",
//     "ELECTRICAL INSTALLATION",
//     "ELECTRICAL WORKS",
//     "ELECTRICAL WORK",
//     "LIGHTING WORKS",
//     "LIGHTING",
//     "POWER WORKS",
//     "POWER",
//     "CABLE WORKS",
//     "CABLING WORKS",
//     "CABLING",
//     "EARTHING WORKS",
//     "EARTHING",
//     "PANEL",
//     "PANELS",
//     "DB WORKS",
//     "CIVIL WORKS",
//     "FIRE ALARM",
//     "FIRE FIGHTING",
//     "HVAC WORKS",
//     "PLUMBING WORKS",
//   ];

//   return headingPrefixes.some((prefix) =>
//     upper.startsWith(prefix)
//   );
// }

// /**
//  * Determine if a row contains any actual item information.
//  */
// function hasItemLikeInformation(
//   description: string,
//   unit: string,
//   quantityInfo: {
//     quantity: number;
//     isRateOnly: boolean;
//     isNumeric: boolean;
//   },
//   rate: number
// ): boolean {
//   if (!description) return false;

//   return (
//     unit.length > 0 ||
//     quantityInfo.isNumeric ||
//     quantityInfo.isRateOnly ||
//     rate > 0
//   );
// }

// /**
//  * Determine whether a row is a section heading.
//  *
//  * IMPORTANT:
//  *
//  * Serial number is NOT used as a validation rule.
//  *
//  * Therefore all of these are valid serial numbers:
//  *
//  * A
//  * B
//  * 1
//  * 2.1
//  * 5.a
//  * a
//  * a)
//  * 1.0
//  * 1.2.8
//  * 1.5.2.2
//  */
// function determineHeading(
//   description: string,
//   unit: string,
//   quantityInfo: {
//     quantity: number;
//     isRateOnly: boolean;
//     isNumeric: boolean;
//   },
//   rate: number
// ): boolean {
//   if (!description) return false;

//   /*
//    * Explicit known section headings.
//    */
//   if (looksLikeKnownHeading(description)) {
//     return true;
//   }

//   /*
//    * If the row has clear item information, it is an item.
//    */
//   if (
//     hasItemLikeInformation(
//       description,
//       unit,
//       quantityInfo,
//       rate
//     )
//   ) {
//     return false;
//   }

//   /*
//    * A row containing only descriptive text with no unit,
//    * no quantity and no rate is normally a section heading
//    * or continuation/notes row.
//    */
//   return true;
// }

// /* ============================================================
//  * MAIN EXCEL PARSER
//  * ============================================================ */

// /**
//  * Parses a Tender BOQ Excel or CSV file.
//  *
//  * The parser intentionally does NOT validate serial number format.
//  *
//  * Examples of valid serial numbers:
//  *
//  * A
//  * B
//  * a
//  * b
//  * 1
//  * 2
//  * 2.1
//  * 5.a
//  * 1.0
//  * a)
//  * 1.2.8
//  * 1.5.2.2
//  *
//  * It primarily identifies the SERIAL NUMBER COLUMN from its
//  * header, then preserves whatever value appears in that column.
//  */
// export function parseTenderExcel(
//   arrayBuffer: ArrayBuffer
// ): ParseTenderResult[] {
//   const workbook = XLSX.read(arrayBuffer, {
//     type: "array",
//     cellDates: true,
//     cellNF: true,
//     cellText: true,
//   });

//   const results: ParseTenderResult[] = [];

//   for (const sheetName of workbook.SheetNames) {
//     const worksheet = workbook.Sheets[sheetName];

//     if (!worksheet) continue;

//     /*
//      * Convert sheet to a 2D array.
//      *
//      * raw values are kept so that we can separately inspect
//      * the actual Excel cell formatting/display value.
//      */
//     const rawRows: any[][] = XLSX.utils.sheet_to_json(
//       worksheet,
//       {
//         header: 1,
//         defval: "",
//         raw: true,
//       }
//     );

//     if (!rawRows || rawRows.length === 0) {
//       continue;
//     }

//     /*
//      * Find the actual header row.
//      *
//      * Unlike the old parser, this scans the complete used sheet
//      * instead of only the first 25 rows.
//      */
//     const header = detectHeaderRow(
//       worksheet,
//       rawRows
//     );

//     const {
//       headerRowIdx,
//       slColIdx,
//       descColIdx,
//       unitColIdx,
//       qtyColIdx,
//       rateColIdx,
//     } = header;

//     if (
//       headerRowIdx < 0 ||
//       descColIdx < 0
//     ) {
//       continue;
//     }

//     const parsedRows: ParsedTenderRow[] = [];

//     let itemsCount = 0;
//     let headingsCount = 0;

//     /*
//      * Parse rows below the detected header.
//      */
//     for (
//       let r = headerRowIdx + 1;
//       r < rawRows.length;
//       r++
//     ) {
//       const row = rawRows[r];

//       if (!Array.isArray(row)) {
//         continue;
//       }

//       /*
//        * IMPORTANT:
//        *
//        * Serial number is read as a DISPLAYED Excel value.
//        *
//        * This helps preserve:
//        *
//        * 1.0
//        * 1.1
//        * 1.2.8
//        * A
//        * a)
//        * etc.
//        */
//       const rawSl =
//         slColIdx !== -1
//           ? getCellValue(
//               worksheet,
//               r,
//               slColIdx,
//               row[slColIdx]
//             )
//           : "";

//       const rawDesc =
//         descColIdx !== -1
//           ? getCellValue(
//               worksheet,
//               r,
//               descColIdx,
//               row[descColIdx]
//             )
//           : "";

//       const rawUnit =
//         unitColIdx !== -1
//           ? getCellValue(
//               worksheet,
//               r,
//               unitColIdx,
//               row[unitColIdx]
//             )
//           : "";

//       const rawQty =
//         qtyColIdx !== -1
//           ? getCellValue(
//               worksheet,
//               r,
//               qtyColIdx,
//               row[qtyColIdx]
//             )
//           : "";

//       const rawRate =
//         rateColIdx !== -1
//           ? getCellValue(
//               worksheet,
//               r,
//               rateColIdx,
//               row[rateColIdx]
//             )
//           : "";

//       /*
//        * Skip completely empty rows.
//        */
//       if (
//         !rawSl &&
//         !rawDesc &&
//         !rawUnit &&
//         !rawQty &&
//         !rawRate
//       ) {
//         continue;
//       }

//       /*
//        * Clean description.
//        */
//       const cleanDesc = cleanText(rawDesc);

//       /*
//        * Ignore rows where there is no description.
//        */
//       if (!cleanDesc) {
//         continue;
//       }

//       /*
//        * Parse quantity.
//        */
//       const quantityInfo = parseQuantity(rawQty);

//       /*
//        * Parse rate.
//        */
//       const numericRate = parseNumericValue(rawRate);

//       /*
//        * Determine whether this is a heading or item.
//        */
//       const isHeading = determineHeading(
//         cleanDesc,
//         rawUnit,
//         quantityInfo,
//         numericRate
//       );

//       if (isHeading) {
//         headingsCount++;

//         parsedRows.push({
//           isHeading: true,
//           serialNumber: rawSl,
//           description: `<strong>${cleanDesc}</strong>`,
//           unit: "",
//           quantity: 0,
//           rate: 0,
//         });
//       } else {
//         itemsCount++;

//         parsedRows.push({
//           isHeading: false,
//           serialNumber: rawSl,
//           description: cleanDesc,
//           unit: rawUnit || "Nos",
//           quantity: quantityInfo.quantity,
//           rate: numericRate,
//         });
//       }
//     }

//     /*
//      * Only add sheets that produced useful rows.
//      */
//     if (parsedRows.length > 0) {
//       results.push({
//         sheetName,
//         rows: parsedRows,
//         totalItemsCount: itemsCount,
//         totalHeadingsCount: headingsCount,
//       });
//     }
//   }

//   return results;
// }

// /* ============================================================
//  * CONVERT TO QUOTATION ITEMS
//  * ============================================================ */

// /**
//  * Converts ParsedTenderRow array into QuotationItem array.
//  *
//  * Automatically matches items against database Activities
//  * and Materials / Products by name or code.
//  */
// export function convertTenderRowsToQuotationItems(
//   rows: ParsedTenderRow[],
//   startSortOrder: number = 0,
//   activities: any[] = [],
//   products: any[] = []
// ): {
//   items: QuotationItem[];
//   activityMappings: Record<number, string>;
// } {
//   const activityMappings: Record<number, string> = {};

//   const items = rows.map((row, idx) => {
//     const isHeading = row.isHeading;
//     const globalIdx = startSortOrder + idx;

//     /*
//      * Section heading.
//      */
//     if (isHeading) {
//       return {
//         id: `tender-item-${Date.now()}-${idx}-${Math.random()
//           .toString(36)
//           .substr(2, 4)}`,
//         description: row.description,
//         unit: "",
//         quantity: 0,
//         rate: 0,
//         discountPct: 0,
//         profitPct: 0,
//         taxRate: 0,
//         amount: 0,
//         sortOrder: globalIdx,
//         snapshotData: {
//           isHeading: true,
//           serialNumber: row.serialNumber,
//           isTenderImported: true,
//         },
//       };
//     }

//     const normDesc = normalizeString(
//       row.description
//     );

//     let matchedActivity: any = null;
//     let matchedProduct: any = null;

//     /* ========================================================
//      * 1. MATCH DATABASE ACTIVITIES
//      * ======================================================== */

//     if (
//       normDesc &&
//       activities.length > 0
//     ) {
//       matchedActivity = activities.find(
//         (act) => {
//           const actNormName =
//             normalizeString(
//               act.name || ""
//             );

//           const actNormCode =
//             normalizeString(
//               act.code || ""
//             );

//           return (
//             actNormName === normDesc ||
//             actNormCode === normDesc ||
//             (
//               actNormName.length > 4 &&
//               normDesc.includes(actNormName)
//             ) ||
//             (
//               normDesc.length > 4 &&
//               actNormName.includes(normDesc)
//             )
//           );
//         }
//       );
//     }

//     /* ========================================================
//      * 2. MATCH DATABASE MATERIALS / PRODUCTS
//      * ======================================================== */

//     if (
//       !matchedActivity &&
//       normDesc &&
//       products.length > 0
//     ) {
//       matchedProduct = products.find(
//         (prod) => {
//           const prodName =
//             normalizeString(
//               prod.name || ""
//             );

//           const prodCode =
//             normalizeString(
//               prod.modelCode || ""
//             );

//           return (
//             (
//               prodName.length > 3 &&
//               (
//                 prodName === normDesc ||
//                 normDesc.includes(prodName)
//               )
//             ) ||
//             (
//               prodCode.length > 3 &&
//               (
//                 prodCode === normDesc ||
//                 normDesc.includes(prodCode)
//               )
//             )
//           );
//         }
//       );
//     }

//     /* ========================================================
//      * RATE / SNAPSHOT
//      * ======================================================== */

//     let itemRate = row.rate;
//     let materialRate = row.rate;
//     let labourRate = 0;

//     let snapshotData: any = {
//       isHeading: false,
//       serialNumber: row.serialNumber,
//       isTenderImported: true,
//     };

//     /* ========================================================
//      * ACTIVITY MATCHED
//      * ======================================================== */

//     if (matchedActivity) {
//       const matCost =
//         Number(
//           matchedActivity.materialCost
//         ) || 0;

//       const labCost =
//         Number(
//           matchedActivity.labourCost
//         ) || 0;

//       const actRate =
//         matCost + labCost;

//       /*
//        * Map activity to this row index.
//        */
//       activityMappings[globalIdx] =
//         matchedActivity.id;

//       /*
//        * Priority:
//        *
//        * 1. Tender rate
//        * 2. Activity rate
//        * 3. 0
//        */
//       itemRate =
//         itemRate > 0
//           ? itemRate
//           : actRate > 0
//           ? actRate
//           : 0;

//       materialRate = matCost;
//       labourRate = labCost;

//       snapshotData = {
//         ...snapshotData,
//         activityId:
//           matchedActivity.id,
//         activityName:
//           matchedActivity.name,
//         materialRate: matCost,
//         labourRate: labCost,
//       };
//     }

//     /* ========================================================
//      * PRODUCT MATCHED
//      * ======================================================== */

//     else if (matchedProduct) {
//       const mrp =
//         Number(
//           matchedProduct.mrp
//         ) || 0;

//       /*
//        * Priority:
//        *
//        * 1. Tender rate
//        * 2. Product MRP
//        * 3. 0
//        */
//       itemRate =
//         itemRate > 0
//           ? itemRate
//           : mrp;

//       materialRate = mrp;

//       snapshotData = {
//         ...snapshotData,
//         productId:
//           matchedProduct.id,
//         productName:
//           matchedProduct.name ||
//           matchedProduct.modelCode,
//         materialRate: mrp,
//         labourRate: 0,
//       };
//     }

//     /* ========================================================
//      * FINAL AMOUNT
//      * ======================================================== */

//     const qty = row.quantity;

//     const calcAmount =
//       qty * itemRate;

//     return {
//       id: `tender-item-${Date.now()}-${idx}-${Math.random()
//         .toString(36)
//         .substr(2, 4)}`,
//       description: row.description,
//       unit: row.unit || "Nos",
//       quantity: qty,
//       rate: itemRate,
//       discountPct: 0,
//       profitPct: 0,
//       taxRate: 0,
//       amount: calcAmount,
//       sortOrder: globalIdx,
//       snapshotData,
//     };
//   });

//   return {
//     items,
//     activityMappings,
//   };
// }











import * as XLSX from "xlsx";
import { QuotationItem } from "./quotations";

export interface ParsedTenderRow {
  isHeading: boolean;
  serialNumber: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
}

export interface ParseTenderResult {
  sheetName: string;
  rows: ParsedTenderRow[];
  totalItemsCount: number;
  totalHeadingsCount: number;
}

/* ============================================================
 * BASIC HELPERS
 * ============================================================ */

function cleanText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeString(str: string): string {
  return str
    .replace(/<[^>]*>/g, "")
    .toLowerCase()
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Read the displayed value from an Excel cell.
 *
 * This is useful for serial numbers such as:
 *
 * 1.0
 * 1.1
 * 1.2.8
 * A
 * a)
 */
function getCellValue(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  colIndex: number,
  fallbackValue: unknown
): string {
  try {
    const address = XLSX.utils.encode_cell({
      r: rowIndex,
      c: colIndex,
    });

    const cell = worksheet[address];

    if (
      cell &&
      typeof cell.w === "string" &&
      cell.w.trim() !== ""
    ) {
      return cleanText(cell.w);
    }
  } catch {
    // Fall back to raw value.
  }

  return cleanText(fallbackValue);
}

/* ============================================================
 * NUMBER HELPERS
 * ============================================================ */

function parseNumericValue(value: unknown): number {
  const text = cleanText(value);

  if (!text) {
    return 0;
  }

  const normalized = text
    .replace(/₹/gi, "")
    .replace(/rs\.?/gi, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");

  const match = normalized.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return 0;
  }

  const number = Number(match[0]);

  return Number.isFinite(number) ? number : 0;
}

function parseQuantity(value: unknown): {
  quantity: number;
  isRateOnly: boolean;
  isNumeric: boolean;
} {
  const text = cleanText(value);

  if (!text) {
    return {
      quantity: 0,
      isRateOnly: false,
      isNumeric: false,
    };
  }

  const upper = text.toUpperCase();

  const isRateOnly =
    upper === "RO" ||
    upper === "R/O" ||
    upper === "RATE ONLY" ||
    upper === "RATE-ONLY" ||
    upper === "RATEONLY";

  if (isRateOnly) {
    return {
      quantity: 1,
      isRateOnly: true,
      isNumeric: false,
    };
  }

  const quantity = parseNumericValue(text);

  const cleaned = text.replace(/,/g, "").trim();

  const isNumeric =
    /^-?\d+(?:\.\d+)?$/.test(cleaned) ||
    /^-?\d+(?:\.\d+)?\s*[A-Za-z]+$/.test(cleaned);

  return {
    quantity,
    isRateOnly: false,
    isNumeric,
  };
}

/* ============================================================
 * HEADER DEFINITIONS
 * ============================================================ */

const SERIAL_HEADERS = new Set([
  "slno",
  "sl",
  "serialno",
  "serialnumber",
  "srno",
  "srnumber",
  "sno",
  "snumber",
  "itemno",
  "itemnumber",
  "number",
  "no",
  "code",
  "itemcode",
  "itemid",
]);

const DESCRIPTION_HEADERS = new Set([
  "description",
  "itemdescription",
  "itemdesc",
  "item",
  "items",
  "itemname",
  "product",
  "productname",
  "particular",
  "particulars",
  "details",
  "detail",
  "workdescription",
  "workdesc",
  "material",
  "materialdescription",
  "materialdesc",
  "scopeofwork",
  "scope",
  "name",
  "boqitem",
  "boqdescription",
  "descriptionofwork",
  "descriptionofitem",
]);

const UNIT_HEADERS = new Set([
  "unit",
  "units",
  "uom",
  "unitofmeasure",
  "unitofmeasurement",
  "measurement",
  "measure",
  "measuringunit",
]);

const QTY_HEADERS = new Set([
  "qty",
  "quantity",
  "quantities",
  "qtynos",
  "boqqty",
  "boqquantity",
  "requiredqty",
  "requiredquantity",
  "orderqty",
  "orderquantity",
  "totalqty",
  "totalquantity",
  "nos",
  "noofitems",
  "numberofitems",
  "count",
  "qnty",
]);

const RATE_HEADERS = new Set([
  "rate",
  "unitrate",
  "unitprice",
  "price",
  "cost",
  "unitcost",
  "estimatedrate",
  "estimatedprice",
  "basicrate",
  "basicprice",
  "quotedrate",
  "quotedprice",
  "sellingrate",
  "sellingprice",
]);

const AMOUNT_HEADERS = new Set([
  "amount",
  "totalamount",
  "value",
  "totalvalue",
  "estimatedamount",
  "totalcost",
  "costamount",
]);

function matchesHeader(
  normalized: string,
  type:
    | "serial"
    | "description"
    | "unit"
    | "qty"
    | "rate"
    | "amount"
): boolean {
  if (!normalized) {
    return false;
  }

  let headers: Set<string>;

  switch (type) {
    case "serial":
      headers = SERIAL_HEADERS;
      break;

    case "description":
      headers = DESCRIPTION_HEADERS;
      break;

    case "unit":
      headers = UNIT_HEADERS;
      break;

    case "qty":
      headers = QTY_HEADERS;
      break;

    case "rate":
      headers = RATE_HEADERS;
      break;

    case "amount":
      headers = AMOUNT_HEADERS;
      break;
  }

  if (headers.has(normalized)) {
    return true;
  }

  /* Flexible description matching */

  if (
    type === "description" &&
    (
      normalized.includes("description") ||
      normalized.includes("particular") ||
      normalized.includes("itemname") ||
      normalized.includes("productname") ||
      normalized.includes("workdescription") ||
      normalized.includes("materialdescription")
    )
  ) {
    return true;
  }

  /* Flexible quantity matching */

  if (
    type === "qty" &&
    (
      normalized.startsWith("qty") ||
      normalized.startsWith("qnty") ||
      normalized.includes("quantity")
    )
  ) {
    return true;
  }

  /* Flexible unit matching */

  if (
    type === "unit" &&
    (
      normalized.includes("unit") ||
      normalized === "uom" ||
      normalized.includes("measurement")
    )
  ) {
    return true;
  }

  /* Flexible rate matching */

  if (
    type === "rate" &&
    (
      normalized.includes("rate") ||
      normalized.includes("price") ||
      normalized.includes("unitcost")
    )
  ) {
    return true;
  }

  /* Flexible serial matching */

  if (
    type === "serial" &&
    (
      normalized.includes("serial") ||
      normalized === "sno" ||
      normalized === "srno" ||
      normalized === "slno" ||
      normalized.includes("itemno")
    )
  ) {
    return true;
  }

  return false;
}

/* ============================================================
 * HEADER DETECTION
 * ============================================================ */

interface HeaderDetectionResult {
  headerRowIdx: number;
  slColIdx: number;
  descColIdx: number;
  unitColIdx: number;
  qtyColIdx: number;
  rateColIdx: number;
  amountColIdx: number;
  confidence: number;
}

function detectHeaderRow(
  worksheet: XLSX.WorkSheet,
  rawRows: any[][]
): HeaderDetectionResult {
  let best: HeaderDetectionResult = {
    headerRowIdx: -1,
    slColIdx: -1,
    descColIdx: -1,
    unitColIdx: -1,
    qtyColIdx: -1,
    rateColIdx: -1,
    amountColIdx: -1,
    confidence: -1,
  };

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];

    if (!Array.isArray(row) || row.length === 0) {
      continue;
    }

    let foundSl = -1;
    let foundDesc = -1;
    let foundUnit = -1;
    let foundQty = -1;
    let foundRate = -1;
    let foundAmount = -1;

    let score = 0;

    for (let c = 0; c < row.length; c++) {
      const value = getCellValue(
        worksheet,
        r,
        c,
        row[c]
      );

      if (!value) {
        continue;
      }

      const normalized = normalizeHeader(value);

      if (
        foundSl === -1 &&
        matchesHeader(normalized, "serial")
      ) {
        foundSl = c;
        score += 2;
        continue;
      }

      if (
        foundDesc === -1 &&
        matchesHeader(normalized, "description")
      ) {
        foundDesc = c;
        score += 5;
        continue;
      }

      if (
        foundUnit === -1 &&
        matchesHeader(normalized, "unit")
      ) {
        foundUnit = c;
        score += 2;
        continue;
      }

      if (
        foundQty === -1 &&
        matchesHeader(normalized, "qty")
      ) {
        foundQty = c;
        score += 4;
        continue;
      }

      if (
        foundRate === -1 &&
        matchesHeader(normalized, "rate")
      ) {
        foundRate = c;
        score += 2;
        continue;
      }

      if (
        foundAmount === -1 &&
        matchesHeader(normalized, "amount")
      ) {
        foundAmount = c;
        score += 1;
      }
    }

    const hasDescription =
      foundDesc !== -1;

    const hasSupportingColumn =
      foundQty !== -1 ||
      foundUnit !== -1 ||
      foundSl !== -1 ||
      foundRate !== -1;

    if (
      !hasDescription ||
      !hasSupportingColumn
    ) {
      continue;
    }

    if (foundQty !== -1) {
      score += 3;
    }

    if (foundUnit !== -1) {
      score += 2;
    }

    if (foundSl !== -1) {
      score += 2;
    }

    if (foundRate !== -1) {
      score += 2;
    }

    /*
     * Prefer earlier rows only when the score is effectively equal.
     */
    const adjustedScore =
      score - r * 0.0001;

    if (
      adjustedScore >
      best.confidence
    ) {
      best = {
        headerRowIdx: r,
        slColIdx: foundSl,
        descColIdx: foundDesc,
        unitColIdx: foundUnit,
        qtyColIdx: foundQty,
        rateColIdx: foundRate,
        amountColIdx: foundAmount,
        confidence: adjustedScore,
      };
    }
  }

  /*
   * Positional fallback.
   */
  if (best.headerRowIdx === -1) {
    let firstMeaningfulRow = 0;

    for (
      let r = 0;
      r < rawRows.length;
      r++
    ) {
      const row = rawRows[r];

      if (!Array.isArray(row)) {
        continue;
      }

      if (
        row.some(
          (value) =>
            cleanText(value).length > 0
        )
      ) {
        firstMeaningfulRow = r;
        break;
      }
    }

    const firstRow =
      rawRows[firstMeaningfulRow] || [];

    let slIdx = 0;
    let descIdx = 1;
    let unitIdx = 2;
    let qtyIdx = 3;
    let rateIdx = 4;

    for (
      let c = 0;
      c < firstRow.length;
      c++
    ) {
      const value = getCellValue(
        worksheet,
        firstMeaningfulRow,
        c,
        firstRow[c]
      );

      const normalized =
        normalizeHeader(value);

      if (
        matchesHeader(
          normalized,
          "serial"
        )
      ) {
        slIdx = c;
      }

      if (
        matchesHeader(
          normalized,
          "description"
        )
      ) {
        descIdx = c;
      }

      if (
        matchesHeader(
          normalized,
          "unit"
        )
      ) {
        unitIdx = c;
      }

      if (
        matchesHeader(
          normalized,
          "qty"
        )
      ) {
        qtyIdx = c;
      }

      if (
        matchesHeader(
          normalized,
          "rate"
        )
      ) {
        rateIdx = c;
      }
    }

    best = {
      headerRowIdx:
        firstMeaningfulRow,
      slColIdx: slIdx,
      descColIdx: descIdx,
      unitColIdx: unitIdx,
      qtyColIdx: qtyIdx,
      rateColIdx: rateIdx,
      amountColIdx: -1,
      confidence: 0,
    };
  }

  return best;
}

/* ============================================================
 * HEADING DETECTION
 * ============================================================ */

function looksLikeKnownHeading(
  description: string
): boolean {
  const upper =
    cleanText(description).toUpperCase();

  if (!upper) {
    return false;
  }

  const headingPrefixes = [
    "SUMMARY OF",
    "WIRING FOR",
    "DISTRIBUTION BOARDS",
    "DISTRIBUTION BOARD",
    "POINT WIRING",
    "HT INSTALLATION",
    "LT INSTALLATION",
    "LV INSTALLATION",
    "MV INSTALLATION",
    "ELECTRICAL INSTALLATION",
    "ELECTRICAL WORKS",
    "ELECTRICAL WORK",
    "LIGHTING WORKS",
    "LIGHTING",
    "POWER WORKS",
    "POWER",
    "CABLE WORKS",
    "CABLING WORKS",
    "CABLING",
    "EARTHING WORKS",
    "EARTHING",
    "DB WORKS",
    "CIVIL WORKS",
    "FIRE ALARM",
    "FIRE FIGHTING",
    "HVAC WORKS",
    "PLUMBING WORKS",
  ];

  return headingPrefixes.some(
    (prefix) =>
      upper === prefix ||
      upper.startsWith(prefix + " ")
  );
}

/* ============================================================
 * INTERNAL RAW ROW
 * ============================================================ */

interface RawTenderRow {
  rowIndex: number;
  serialNumber: string;
  description: string;
  unit: string;
  quantity: number;
  quantityText: string;
  isNumericQuantity: boolean;
  isRateOnly: boolean;
  rate: number;
  hasAnyValue: boolean;
}

/* ============================================================
 * ROW READING
 * ============================================================ */

function readTenderRow(
  worksheet: XLSX.WorkSheet,
  rawRows: any[][],
  rowIndex: number,
  header: HeaderDetectionResult
): RawTenderRow {
  const row =
    rawRows[rowIndex] || [];

  const serialNumber =
    header.slColIdx !== -1
      ? getCellValue(
          worksheet,
          rowIndex,
          header.slColIdx,
          row[header.slColIdx]
        )
      : "";

  const description =
    header.descColIdx !== -1
      ? getCellValue(
          worksheet,
          rowIndex,
          header.descColIdx,
          row[header.descColIdx]
        )
      : "";

  const unit =
    header.unitColIdx !== -1
      ? getCellValue(
          worksheet,
          rowIndex,
          header.unitColIdx,
          row[header.unitColIdx]
        )
      : "";

  const quantityText =
    header.qtyColIdx !== -1
      ? getCellValue(
          worksheet,
          rowIndex,
          header.qtyColIdx,
          row[header.qtyColIdx]
        )
      : "";

  const rateText =
    header.rateColIdx !== -1
      ? getCellValue(
          worksheet,
          rowIndex,
          header.rateColIdx,
          row[header.rateColIdx]
        )
      : "";

  const quantityInfo =
    parseQuantity(quantityText);

  const rate =
    parseNumericValue(rateText);

  const hasAnyValue =
    Boolean(
      serialNumber ||
      description ||
      unit ||
      quantityText ||
      rateText
    );

  return {
    rowIndex,
    serialNumber,
    description: cleanText(description),
    unit,
    quantity: quantityInfo.quantity,
    quantityText,
    isNumericQuantity:
      quantityInfo.isNumeric,
    isRateOnly:
      quantityInfo.isRateOnly,
    rate,
    hasAnyValue,
  };
}

/* ============================================================
 * DESCRIPTION MERGING
 * ============================================================ */

function mergeDescription(
  current: string,
  addition: string
): string {
  const first = cleanText(current);
  const second = cleanText(addition);

  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return `${first} ${second}`.trim();
}

/**
 * Determines whether a row contains actual BOQ item data.
 */
function rowHasItemData(
  row: RawTenderRow
): boolean {
  return (
    row.unit.length > 0 ||
    row.isNumericQuantity ||
    row.isRateOnly ||
    row.rate > 0
  );
}

/**
 * Determines whether a row is obviously a heading.
 */
function rowLooksLikeHeading(
  row: RawTenderRow
): boolean {
  if (!row.description) {
    return false;
  }

  if (
    looksLikeKnownHeading(
      row.description
    )
  ) {
    return true;
  }

  /*
   * If it has no item information,
   * it may be a heading.
   *
   * We don't immediately finalize it because it could
   * be the first line of a multi-row item description.
   */
  return !rowHasItemData(row);
}

/**
 * A row with a serial number is considered the beginning
 * of a new logical BOQ record.
 *
 * IMPORTANT:
 * There is NO restriction on the serial number format.
 */
function hasSerialNumber(
  row: RawTenderRow
): boolean {
  return cleanText(
    row.serialNumber
  ).length > 0;
}

/* ============================================================
 * LOGICAL ROW BUILDER
 * ============================================================ */

function buildLogicalRows(
  worksheet: XLSX.WorkSheet,
  rawRows: any[][],
  header: HeaderDetectionResult
): ParsedTenderRow[] {
  const output: ParsedTenderRow[] = [];

  /*
   * Pending record.
   *
   * This is important for rows like:
   *
   * b) | MSB KSEB Incomer:
      | 200A 4P MCCB...
      | ELR & CBCT...
      | Meters:
      | (a) RYB...
      | (b) Multifunction meter... | No. | 1
   *
   * The entire block becomes ONE item.
   */
  let pending: RawTenderRow | null = null;

  /*
   * Continuation text collected while an item is being built.
   */
  let pendingDescription = "";

  function flushPending(
    forceAsHeading?: boolean
  ) {
    if (!pending) {
      return;
    }

    const finalDescription =
      mergeDescription(
        pendingDescription,
        ""
      );

    if (!finalDescription) {
      pending = null;
      pendingDescription = "";
      return;
    }

    const isHeading =
      forceAsHeading === true ||
      (
        !rowHasItemData(pending) &&
        !looksLikeKnownHeading(
          finalDescription
        )
      );

    /*
     * If the pending record contains actual item data,
     * it is definitely an item.
     *
     * Otherwise it is a heading.
     */
    const finalIsHeading =
      rowHasItemData(pending)
        ? false
        : forceAsHeading === true
        ? true
        : looksLikeKnownHeading(
            finalDescription
          );

    output.push({
      isHeading:
        finalIsHeading || isHeading,
      serialNumber:
        pending.serialNumber,
      description:
        finalIsHeading || isHeading
          ? `<strong>${finalDescription}</strong>`
          : finalDescription,
      unit:
        finalIsHeading || isHeading
          ? ""
          : pending.unit || "Nos",
      quantity:
        finalIsHeading || isHeading
          ? 0
          : pending.quantity,
      rate:
        finalIsHeading || isHeading
          ? 0
          : pending.rate,
    });

    pending = null;
    pendingDescription = "";
  }

  function startPending(
    row: RawTenderRow
  ) {
    pending = {
      ...row,
    };

    pendingDescription =
      row.description;
  }

  function addContinuation(
    row: RawTenderRow
  ) {
    if (!pending) {
      startPending(row);
      return;
    }

    pendingDescription =
      mergeDescription(
        pendingDescription,
        row.description
      );

    /*
     * If the continuation row contains Unit,
     * Quantity or Rate, use those values.
     *
     * This is the key behaviour for the image you showed.
     */
    if (row.unit) {
      pending.unit = row.unit;
    }

    if (
      row.isNumericQuantity ||
      row.isRateOnly
    ) {
      pending.quantity =
        row.quantity;

      pending.quantityText =
        row.quantityText;

      pending.isNumericQuantity =
        row.isNumericQuantity;

      pending.isRateOnly =
        row.isRateOnly;
    }

    if (row.rate > 0) {
      pending.rate = row.rate;
    }
  }

  for (
    let r = header.headerRowIdx + 1;
    r < rawRows.length;
    r++
  ) {
    const row = readTenderRow(
      worksheet,
      rawRows,
      r,
      header
    );

    /*
     * Completely empty row.
     *
     * Do NOT immediately flush pending item.
     *
     * Excel BOQ descriptions often contain blank rows
     * due to formatting.
     */
    if (!row.hasAnyValue) {
      continue;
    }

    /*
     * Ignore rows without description if they don't
     * contain useful item information.
     */
    if (
      !row.description &&
      !row.unit &&
      !row.quantityText &&
      !row.rate
    ) {
      continue;
    }

    const currentHasSerial =
      hasSerialNumber(row);

    /*
     * ========================================================
     * NEW SERIAL NUMBER
     * ========================================================
     *
     * A serial number always indicates the beginning of
     * a new logical record.
     *
     * No matter whether the serial is:
     *
     * A
     * a
     * 1
     * 2.1
     * 5.a
     * a)
     * 1.0
     * 1.2.8
     * 1.5.2.2
     */
    if (currentHasSerial) {
      /*
       * If there is an existing pending record, decide
       * what it was before starting the new record.
       */
      if (pending) {
        /*
         * If pending had item data, flush as item.
         */
        if (
          rowHasItemData(pending)
        ) {
          flushPending(false);
        } else {
          /*
           * Pending has no Unit/QTY/Rate.
           *
           * If it is a known heading, definitely heading.
           *
           * Otherwise, because another serial number has
           * now appeared, this is most likely a section heading.
           */
          flushPending(true);
        }
      }

      /*
       * Start the new logical record.
       */
      startPending(row);

      continue;
    }

    /*
     * ========================================================
     * ROW WITHOUT SERIAL NUMBER
     * ========================================================
     *
     * This is normally a continuation of the previous
     * description.
     */
    if (pending) {
      addContinuation(row);

      continue;
    }

    /*
     * ========================================================
     * NO SERIAL + NO PENDING
     * ========================================================
     *
     * This can happen for:
     *
     * - heading rows without serial numbers
     * - malformed BOQ rows
     * - continuation rows after formatting gaps
     */
    if (
      row.description
    ) {
      startPending(row);
    }
  }

  /*
   * Flush the last pending record.
   */
  if (pending) {
    /*
     * If it contains item data -> item.
     *
     * Otherwise -> heading.
     */
    flushPending(
      !rowHasItemData(pending)
    );
  }

  return output;
}

/* ============================================================
 * MAIN PARSER
 * ============================================================ */

/**
 * Parses Tender BOQ Excel / XLS / CSV.
 *
 * Serial numbers are intentionally treated as strings.
 *
 * Supported examples:
 *
 * A
 * B
 * a
 * b
 * c
 * 1
 * 2
 * 2.1
 * 5.a
 * 1.0
 * a)
 * 1.2.8
 * 1.5.2.2
 *
 * Multi-row descriptions are combined into a single
 * logical quotation item.
 */
export function parseTenderExcel(
  arrayBuffer: ArrayBuffer
): ParseTenderResult[] {
  const workbook = XLSX.read(
    arrayBuffer,
    {
      type: "array",
      cellDates: true,
      cellNF: true,
      cellText: true,
    }
  );

  const results: ParseTenderResult[] = [];

  for (
    const sheetName of workbook.SheetNames
  ) {
    const worksheet =
      workbook.Sheets[sheetName];

    if (!worksheet) {
      continue;
    }

    /*
     * Convert sheet into a 2D array.
     *
     * raw:true allows us to preserve the underlying values.
     * getCellValue() separately attempts to preserve the
     * displayed Excel value.
     */
    const rawRows: any[][] =
      XLSX.utils.sheet_to_json(
        worksheet,
        {
          header: 1,
          defval: "",
          raw: true,
        }
      );

    if (
      !rawRows ||
      rawRows.length === 0
    ) {
      continue;
    }

    /*
     * Detect the actual BOQ header.
     *
     * Searches the entire worksheet.
     */
    const header =
      detectHeaderRow(
        worksheet,
        rawRows
      );

    if (
      header.headerRowIdx < 0 ||
      header.descColIdx < 0
    ) {
      continue;
    }

    /*
     * Build logical BOQ rows.
     *
     * This is where multi-row descriptions are merged.
     */
    const parsedRows =
      buildLogicalRows(
        worksheet,
        rawRows,
        header
      );

    if (
      !parsedRows ||
      parsedRows.length === 0
    ) {
      continue;
    }

    let itemsCount = 0;
    let headingsCount = 0;

    for (
      const row of parsedRows
    ) {
      if (row.isHeading) {
        headingsCount++;
      } else {
        itemsCount++;
      }
    }

    results.push({
      sheetName,
      rows: parsedRows,
      totalItemsCount:
        itemsCount,
      totalHeadingsCount:
        headingsCount,
    });
  }

  return results;
}

/* ============================================================
 * CONVERT TO QUOTATION ITEMS
 * ============================================================ */

export function convertTenderRowsToQuotationItems(
  rows: ParsedTenderRow[],
  startSortOrder: number = 0,
  activities: any[] = [],
  products: any[] = []
): {
  items: QuotationItem[];
  activityMappings: Record<number, string>;
} {
  const activityMappings:
    Record<number, string> = {};

  const items = rows.map(
    (row, idx) => {
      const isHeading =
        row.isHeading;

      const globalIdx =
        startSortOrder + idx;

      /*
       * ======================================================
       * SECTION HEADING
       * ======================================================
       */

      if (isHeading) {
        return {
          id:
            `tender-item-${Date.now()}-${idx}-${Math.random()
              .toString(36)
              .substr(2, 4)}`,

          description:
            row.description,

          unit: "",

          quantity: 0,

          rate: 0,

          discountPct: 0,

          profitPct: 0,

          taxRate: 0,

          amount: 0,

          sortOrder:
            globalIdx,

          snapshotData: {
            isHeading: true,

            serialNumber:
              row.serialNumber,

            isTenderImported:
              true,
          },
        };
      }

      const normDesc =
        normalizeString(
          row.description
        );

      let matchedActivity:
        any = null;

      let matchedProduct:
        any = null;

      /*
       * ======================================================
       * MATCH ACTIVITY
       * ======================================================
       */

      if (
        normDesc &&
        activities.length > 0
      ) {
        matchedActivity =
          activities.find(
            (act) => {
              const actNormName =
                normalizeString(
                  act.name || ""
                );

              const actNormCode =
                normalizeString(
                  act.code || ""
                );

              return (
                actNormName ===
                  normDesc ||

                actNormCode ===
                  normDesc ||

                (
                  actNormName.length > 4 &&
                  normDesc.includes(
                    actNormName
                  )
                ) ||

                (
                  normDesc.length > 4 &&
                  actNormName.includes(
                    normDesc
                  )
                )
              );
            }
          );
      }

      /*
       * ======================================================
       * MATCH PRODUCT
       * ======================================================
       */

      if (
        !matchedActivity &&
        normDesc &&
        products.length > 0
      ) {
        matchedProduct =
          products.find(
            (prod) => {
              const prodName =
                normalizeString(
                  prod.name || ""
                );

              const prodCode =
                normalizeString(
                  prod.modelCode || ""
                );

              return (
                (
                  prodName.length > 3 &&
                  (
                    prodName ===
                      normDesc ||
                    normDesc.includes(
                      prodName
                    )
                  )
                ) ||

                (
                  prodCode.length > 3 &&
                  (
                    prodCode ===
                      normDesc ||
                    normDesc.includes(
                      prodCode
                    )
                  )
                )
              );
            }
          );
      }

      /*
       * ======================================================
       * RATE
       * ======================================================
       */

      let itemRate =
        row.rate;

      let materialRate =
        row.rate;

      let labourRate = 0;

      let snapshotData: any = {
        isHeading: false,

        serialNumber:
          row.serialNumber,

        isTenderImported:
          true,
      };

      /*
       * ======================================================
       * ACTIVITY MATCH
       * ======================================================
       */

      if (matchedActivity) {
        const matCost =
          Number(
            matchedActivity.materialCost
          ) || 0;

        const labCost =
          Number(
            matchedActivity.labourCost
          ) || 0;

        const actRate =
          matCost + labCost;

        activityMappings[
          globalIdx
        ] =
          matchedActivity.id;

        itemRate =
          itemRate > 0
            ? itemRate
            : actRate > 0
            ? actRate
            : 0;

        materialRate =
          matCost;

        labourRate =
          labCost;

        snapshotData = {
          ...snapshotData,

          activityId:
            matchedActivity.id,

          activityName:
            matchedActivity.name,

          materialRate:
            matCost,

          labourRate:
            labCost,
        };
      }

      /*
       * ======================================================
       * PRODUCT MATCH
       * ======================================================
       */

      else if (
        matchedProduct
      ) {
        const mrp =
          Number(
            matchedProduct.mrp
          ) || 0;

        itemRate =
          itemRate > 0
            ? itemRate
            : mrp;

        materialRate =
          mrp;

        snapshotData = {
          ...snapshotData,

          productId:
            matchedProduct.id,

          productName:
            matchedProduct.name ||
            matchedProduct.modelCode,

          materialRate:
            mrp,

          labourRate: 0,
        };
      }

      /*
       * ======================================================
       * FINAL AMOUNT
       * ======================================================
       */

      const qty =
        row.quantity;

      const calcAmount =
        qty * itemRate;

      return {
        id:
          `tender-item-${Date.now()}-${idx}-${Math.random()
            .toString(36)
            .substr(2, 4)}`,

        description:
          row.description,

        unit:
          row.unit || "Nos",

        quantity:
          qty,

        rate:
          itemRate,

        discountPct: 0,

        profitPct: 0,

        taxRate: 0,

        amount:
          calcAmount,

        sortOrder:
          globalIdx,

        snapshotData,
      };
    }
  );

  return {
    items,
    activityMappings,
  };
}