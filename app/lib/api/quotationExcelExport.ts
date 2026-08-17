"use client";

import * as XLSX from "xlsx";
import type { Quotation, QuotationItem } from "./quotations";
import type { Activity } from "./activities";
import type { ProductModel } from "../catalog/types";

// Helper to strip HTML tags for clean Excel text output
function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

interface ExportExcelOptions {
  quotation: Quotation;
  items: QuotationItem[];
  pricingMode: "combined" | "separate";
  profitShift: number;
  activities: Activity[];
  activityRows: Record<number, string>;
  activityCustomizations: Record<number, Record<string, string>>;
  products: ProductModel[];
}

export function exportQuotationToExcel({
  quotation,
  items,
  pricingMode,
  profitShift,
  activities,
  activityRows,
  activityCustomizations,
  products,
}: ExportExcelOptions) {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // SHEET 1: QUOTATION BOQ SUMMARY
  // -------------------------------------------------------------
  const sheet1Data: any[][] = [];

  const qNum = quotation.code || (quotation as any).quotationNumber || quotation.id || "-";
  const qTitle = quotation.project?.name || (quotation as any).title || "-";
  const clientName = quotation.customer?.name || (quotation as any).clientName || "-";

  // Header Info
  sheet1Data.push(["QUOTATION BOQ SUMMARY"]);
  sheet1Data.push(["Quotation Number:", qNum]);
  sheet1Data.push(["Title / Project:", qTitle]);
  sheet1Data.push(["Client Name:", clientName]);
  sheet1Data.push(["Date:", quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("en-IN") : "-"]);
  sheet1Data.push([]); // Empty row space

  // Table Headers
  const isSeparate = pricingMode === "separate";
  const hasDiff = profitShift !== 0;

  const headerRow = [
    "SL",
    "ITEM NAME / SPECIFICATION",
    "UNIT",
    "QTY",
    isSeparate ? "MAT RATE" : "RATE",
  ];

  if (isSeparate) {
    headerRow.push("LAB RATE");
  }

  headerRow.push("% PROFIT", "% DISC", "% TAX", "TAX AMT", "SUB TOTAL", "TOTAL");
  if (hasDiff) {
    headerRow.push("DIFF AMT");
  }

  sheet1Data.push(headerRow);

  // Totals accumulators
  let grandSubTotal = 0;
  let grandTaxTotal = 0;
  let grandTotal = 0;

  let currentHeadingSerial = 0;
  let currentItemSerial = 0;

  // Process Rows for Sheet 1
  items.forEach((item, index) => {
    const isHeading = item.snapshotData?.isHeading;
    const isActivity = item.snapshotData?.isActivity || !!activityRows[index];

    if (isHeading) {
      currentHeadingSerial += 1;
      currentItemSerial = 0;
      const headingText = stripHtml(item.description);
      const headingRow = [`SECTION ${currentHeadingSerial}: ${headingText.toUpperCase()}`];
      sheet1Data.push(headingRow);
      return;
    }

    currentItemSerial += 1;
    const slText = currentHeadingSerial > 0 ? `${currentHeadingSerial}.${currentItemSerial}` : `${currentItemSerial}`;
    const cleanDesc = stripHtml(item.description);

    if (isActivity) {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const itemTotal = qty * rate;
      grandSubTotal += itemTotal;
      grandTotal += itemTotal;

      const row = [
        slText,
        cleanDesc,
        item.unit || "NOS",
        qty,
        rate,
      ];

      if (isSeparate) {
        row.push(0); // LAB RATE
      }

      row.push("--", "--", "--", "--", "--", itemTotal);
      if (hasDiff) {
        row.push(0);
      }

      sheet1Data.push(row);
    } else {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const matRate = isSeparate ? Number(item.snapshotData?.materialRate) || rate : rate;
      const labRate = isSeparate ? Number(item.snapshotData?.labourRate) || 0 : 0;
      const totalBaseRate = matRate + labRate;

      const profitPct = Number(item.profitPct) || 0;
      const discPct = Number(item.discountPct) || 0;
      const taxPct = Number(item.taxRate) || 0;

      const baseAmount = qty * totalBaseRate;
      const profitAmt = baseAmount * (profitPct / 100);
      const discAmt = (baseAmount + profitAmt) * (discPct / 100);
      const subTotal = baseAmount + profitAmt - discAmt;
      const taxAmt = subTotal * (taxPct / 100);
      const itemTotal = subTotal + taxAmt;

      grandSubTotal += subTotal;
      grandTaxTotal += taxAmt;
      grandTotal += itemTotal;

      const row = [
        slText,
        cleanDesc,
        item.unit || "NOS",
        qty,
        totalBaseRate,
      ];

      if (isSeparate) {
        row.push(labRate);
      }

      row.push(
        `${profitPct}%`,
        `${discPct}%`,
        `${taxPct}%`,
        Number(taxAmt.toFixed(2)),
        Number(subTotal.toFixed(2)),
        Number(itemTotal.toFixed(2))
      );

      if (hasDiff) {
        const shiftedProfit = profitPct + profitShift;
        const sProfitAmt = baseAmount * (shiftedProfit / 100);
        const sDiscAmt = (baseAmount + sProfitAmt) * (discPct / 100);
        const sSubTotal = baseAmount + sProfitAmt - sDiscAmt;
        const sTaxAmt = sSubTotal * (taxPct / 100);
        const sItemTotal = sSubTotal + sTaxAmt;
        const diff = sItemTotal - itemTotal;
        row.push(Number(diff.toFixed(2)));
      }

      sheet1Data.push(row);
    }
  });

  // Summary Footer
  sheet1Data.push([]);
  sheet1Data.push(["", "", "", "", "", "SUB TOTAL:", Number(grandSubTotal.toFixed(2))]);
  sheet1Data.push(["", "", "", "", "", "TOTAL TAX:", Number(grandTaxTotal.toFixed(2))]);
  sheet1Data.push(["", "", "", "", "", "GRAND TOTAL:", Number(grandTotal.toFixed(2))]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Set Sheet 1 Column Widths
  ws1["!cols"] = [
    { wch: 8 },  // SL
    { wch: 45 }, // ITEM NAME / SPEC
    { wch: 10 }, // UNIT
    { wch: 10 }, // QTY
    { wch: 14 }, // RATE
    { wch: 12 }, // PROFIT
    { wch: 12 }, // DISC
    { wch: 12 }, // TAX
    { wch: 14 }, // TAX AMT
    { wch: 16 }, // SUB TOTAL
    { wch: 16 }, // TOTAL
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Quotation BOQ");

  // -------------------------------------------------------------
  // SHEET 2: ACTIVITY EXPAND DETAILS
  // -------------------------------------------------------------
  const sheet2Data: any[][] = [];

  sheet2Data.push(["ACTIVITY EXPANDED BREAKDOWN DETAILS"]);
  sheet2Data.push(["Quotation Number:", qNum]);
  sheet2Data.push([]); // Space

  let activityCount = 0;

  items.forEach((item, index) => {
    const isActivity = item.snapshotData?.isActivity || !!activityRows[index];
    if (!isActivity) return;

    activityCount += 1;
    const activityId = activityRows[index];
    const activityObj = activities.find(a => a.id === activityId || a.name === item.description);
    const itemQty = Number(item.quantity) || 1;
    const itemRate = Number(item.rate) || 0;
    const itemTotal = itemQty * itemRate;

    const customizations = activityCustomizations[index] || {};

    sheet2Data.push([
      `ACTIVITY #${activityCount}:`,
      stripHtml(item.description),
      `ACTIVITY QTY: ${itemQty}`,
      `FINAL UNIT RATE: ₹${itemRate}`,
      `TOTAL AMOUNT: ₹${itemTotal}`,
    ]);

    // Subtable Header
    sheet2Data.push([
      "TYPE",
      "REQUIREMENT / MATERIAL NAME",
      "SELECTED BRAND / MAKE",
      "SERIES / MODEL",
      "UNIT",
      "QTY PER ACTIVITY",
      "TOTAL QTY",
      "UNIT RATE (₹)",
      "TOTAL COST (₹)",
    ]);

    let activityTotalMatCost = 0;
    let activityTotalLabCost = 0;

    // Materials / Requirements
    if (activityObj?.requirements && activityObj.requirements.length > 0) {
      activityObj.requirements.forEach((req, rIdx) => {
        const reqId = req.id || `${rIdx}`;
        const selectedModelId = customizations[reqId] || (req.options && req.options.find(o => o.isDefault)?.productModelId) || (req.options && req.options[0]?.productModelId);

        const prod = products.find(p => p.id === selectedModelId);
        const brandName = prod?.manufacturer?.name || prod?.manufacturerName || "-";
        const seriesName = prod?.series || prod?.modelCode || "-";
        const unitRate = Number(prod?.mrp) || Number(req.quantity) || 0;

        const reqQtyPerAct = Number(req.quantity) || 1;
        const totalReqQty = reqQtyPerAct * itemQty;
        const lineTotalCost = totalReqQty * unitRate;

        activityTotalMatCost += lineTotalCost;

        sheet2Data.push([
          "Material",
          req.description || "Raw Material",
          brandName,
          seriesName,
          req.unit || "NOS",
          reqQtyPerAct,
          totalReqQty,
          unitRate,
          Number(lineTotalCost.toFixed(2)),
        ]);
      });
    }

    // Charges / Labour
    if (activityObj?.charges && activityObj.charges.length > 0) {
      activityObj.charges.forEach((chg) => {
        const chgAmt = Number(chg.amount) || 0;
        const totalChgCost = chgAmt * itemQty;
        activityTotalLabCost += totalChgCost;

        sheet2Data.push([
          "Labour/Charge",
          chg.description || "Labour / Installation Charge",
          "-",
          "-",
          "LS",
          1,
          itemQty,
          chgAmt,
          Number(totalChgCost.toFixed(2)),
        ]);
      });
    }

    // Activity Subtotal Summary Row
    sheet2Data.push([
      "SUMMARY",
      `TOTAL BREAKDOWN COST FOR ${itemQty} UNITS`,
      "",
      "",
      "",
      "",
      "",
      "BREAKDOWN TOTAL:",
      Number((activityTotalMatCost + activityTotalLabCost).toFixed(2)),
    ]);
    sheet2Data.push([]); // Blank spacing row
  });

  if (activityCount === 0) {
    sheet2Data.push(["No activity items present in this quotation."]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

  ws2["!cols"] = [
    { wch: 15 }, // TYPE
    { wch: 45 }, // REQUIREMENT NAME
    { wch: 22 }, // BRAND
    { wch: 20 }, // SERIES
    { wch: 10 }, // UNIT
    { wch: 16 }, // QTY PER ACT
    { wch: 14 }, // TOTAL QTY
    { wch: 16 }, // UNIT RATE
    { wch: 18 }, // TOTAL COST
  ];

  XLSX.utils.book_append_sheet(wb, ws2, "Activity Expanded Details");

  // Export File
  const filename = `Quotation_${qNum || "Draft"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
