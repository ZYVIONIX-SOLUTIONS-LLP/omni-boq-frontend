// Default data seeded into localStorage on first run. Fixed ids so cross-references
// (material.categoryId, requirement.categoryId, etc.) resolve cleanly.

export const STORAGE_KEYS = {
  categories: "omni.categories",
  brands: "omni.brands",
  materials: "omni.materials",
  activities: "omni.activities",
  quotations: "omni.quotations",
  counters: "omni.counters",
};

export interface SeedCategory {
  id: string;
  name: string;
  isActive: boolean;
}
export interface SeedBrand {
  id: string;
  name: string;
  isActive: boolean;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  { id: "cat-wire", name: "Wire", isActive: true },
  { id: "cat-switch", name: "Switch", isActive: true },
  { id: "cat-socket", name: "Socket", isActive: true },
  { id: "cat-metalbox", name: "Metal Box", isActive: true },
  { id: "cat-pvcbox", name: "PVC Box", isActive: true },
  { id: "cat-coverframe", name: "Cover Frame", isActive: true },
  { id: "cat-pvcconduit", name: "PVC Conduit", isActive: true },
  { id: "cat-fanreg", name: "Fan Regulator", isActive: true },
];

export const SEED_BRANDS: SeedBrand[] = [
  { id: "brand-polycab", name: "Polycab", isActive: true },
  { id: "brand-legrand", name: "Legrand", isActive: true },
  { id: "brand-vguard", name: "V-Guard", isActive: true },
  { id: "brand-rr", name: "RR Kabel", isActive: true },
  { id: "brand-schneider", name: "Schneider Electric", isActive: true },
  { id: "brand-finolex", name: "Finolex", isActive: true },
];

const catName = (id: string) => SEED_CATEGORIES.find((c) => c.id === id)!.name;
const brandName = (id: string) => SEED_BRANDS.find((b) => b.id === id)!.name;

function mat(
  id: string,
  categoryId: string,
  brandId: string | null,
  code: string,
  name: string,
  unit: string,
  unitPrice: number,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    categoryId,
    category: { id: categoryId, name: catName(categoryId) },
    brandId,
    brand: brandId ? { id: brandId, name: brandName(brandId) } : null,
    code,
    name,
    unit,
    unitPrice,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}

export const SEED_MATERIALS = [
  mat("mat-w1", "cat-wire", "brand-polycab", "PLB-FRLS-1.5", "Polycab FRLS 1.5 sq.mm", "MTR", 20, {
    series: "FRLS-H",
    sizeSqmm: 1.5,
    coreCount: 1,
    insulationType: "FRLS-H",
  }),
  mat("mat-w2", "cat-wire", "brand-rr", "RR-FR-1.5", "RR Kabel FR 1.5 sq.mm", "MTR", 18, {
    series: "FR",
    sizeSqmm: 1.5,
    coreCount: 1,
  }),
  mat("mat-w3", "cat-wire", "brand-polycab", "PLB-FRLS-2.5", "Polycab FRLS 2.5 sq.mm", "MTR", 32, {
    series: "FRLS-H",
    sizeSqmm: 2.5,
    coreCount: 1,
  }),
  mat("mat-w4", "cat-wire", "brand-vguard", "VG-FR-4", "V-Guard FR 4 sq.mm", "MTR", 52, {
    sizeSqmm: 4,
    coreCount: 1,
  }),
  mat("mat-sw1", "cat-switch", "brand-legrand", "LG-SW-6A", "Legrand 6A One Way Switch", "NOS", 130),
  mat("mat-sw2", "cat-switch", "brand-legrand", "LG-SW-16A", "Legrand 16A One Way Switch", "NOS", 250),
  mat("mat-sw3", "cat-switch", "brand-schneider", "SCH-BELL", "Schneider Bell Push", "NOS", 120),
  mat("mat-so1", "cat-socket", "brand-legrand", "LG-SO-6A", "Legrand 6A 3 Pin Socket", "NOS", 180),
  mat("mat-so2", "cat-socket", "brand-legrand", "LG-SO-616A", "Legrand 6/16A Socket", "NOS", 300),
  mat("mat-mb1", "cat-metalbox", "brand-legrand", "LG-MB-3M", "GI Flush Box 3 Module", "NOS", 150),
  mat("mat-mb2", "cat-metalbox", "brand-legrand", "LG-MB-4M", "GI Flush Box 4 Module", "NOS", 180),
  mat("mat-cf1", "cat-coverframe", "brand-legrand", "LG-CF-3M", "Cover Plate 3 Module", "NOS", 156),
  mat("mat-cf2", "cat-coverframe", "brand-legrand", "LG-CF-4M", "Cover Plate 4 Module", "NOS", 190),
  mat("mat-cn1", "cat-pvcconduit", "brand-finolex", "FIN-CN-20", "PVC Conduit 20mm Medium Duty", "MTR", 28),
  mat("mat-cn2", "cat-pvcconduit", "brand-finolex", "FIN-CN-25", "PVC Conduit 25mm Medium Duty", "MTR", 38),
  mat("mat-fr1", "cat-fanreg", "brand-legrand", "LG-FR-5S", "Fan Regulator 5-Step", "NOS", 904),
];

// ── Activities (Kerala-standard) with generic requirements ──
type ReqSeed = { categoryId: string; description: string; unit: string; quantity: number };
function req(categoryId: string, description: string, unit: string, quantity: number): ReqSeed {
  return { categoryId, description, unit, quantity };
}
function activity(
  id: string,
  code: string,
  name: string,
  wiringType: "POINT_WIRING" | "CIRCUIT_WIRING",
  segment: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL",
  requirements: ReqSeed[],
) {
  return {
    id,
    code,
    name,
    wiringType,
    segment,
    unit: wiringType === "POINT_WIRING" ? "POINT" : "CIRCUIT",
    description: null,
    isActive: true,
    requirements: requirements.map((r, i) => ({
      id: `${id}-r${i}`,
      categoryId: r.categoryId,
      category: { id: r.categoryId, name: catName(r.categoryId) },
      description: r.description,
      unit: r.unit,
      quantity: r.quantity,
      sortOrder: i,
    })),
  };
}

export const SEED_ACTIVITIES = [
  activity("act-p1", "ACT-P-0001", "One light controlled by one 6A switch", "POINT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Phase)", "MTR", 8),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Neutral)", "MTR", 8),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Earth)", "MTR", 8),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 6),
    req("cat-switch", "6A One Way Switch - 1 Module", "NOS", 1),
    req("cat-metalbox", "GI Flush Box 3 Module", "NOS", 1),
    req("cat-coverframe", "Cover Plate 3 Module", "NOS", 1),
  ]),
  activity("act-p2", "ACT-P-0002", "Two lights controlled by two 6A switches", "POINT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Phase)", "MTR", 12),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Neutral)", "MTR", 12),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Earth)", "MTR", 12),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 9),
    req("cat-switch", "6A One Way Switch - 1 Module", "NOS", 2),
    req("cat-metalbox", "GI Flush Box 3 Module", "NOS", 1),
    req("cat-coverframe", "Cover Plate 3 Module", "NOS", 1),
  ]),
  activity("act-p3", "ACT-P-0003", "Ceiling fan point with 6A switch and regulator", "POINT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Phase)", "MTR", 9),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Neutral)", "MTR", 9),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Earth)", "MTR", 9),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 7),
    req("cat-switch", "6A One Way Switch - 1 Module", "NOS", 1),
    req("cat-fanreg", "Fan Regulator 5-Step - 2 Module", "NOS", 1),
    req("cat-metalbox", "GI Flush Box 4 Module", "NOS", 1),
    req("cat-coverframe", "Cover Plate 4 Module", "NOS", 1),
  ]),
  activity("act-p4", "ACT-P-0004", "6A socket point with 6A switch", "POINT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Phase)", "MTR", 7),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Neutral)", "MTR", 7),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Earth)", "MTR", 7),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 5),
    req("cat-switch", "6A One Way Switch - 1 Module", "NOS", 1),
    req("cat-socket", "6A 3 Pin Socket - 2 Module", "NOS", 1),
    req("cat-metalbox", "GI Flush Box 3 Module", "NOS", 1),
    req("cat-coverframe", "Cover Plate 3 Module", "NOS", 1),
  ]),
  activity("act-p5", "ACT-P-0005", "16A power socket point with 16A switch", "POINT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Phase)", "MTR", 8),
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Neutral)", "MTR", 8),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Earth)", "MTR", 8),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 6),
    req("cat-switch", "16A One Way Switch - 1 Module", "NOS", 1),
    req("cat-socket", "6/16A 3 Pin Socket - 2 Module", "NOS", 1),
    req("cat-metalbox", "GI Flush Box 3 Module", "NOS", 1),
    req("cat-coverframe", "Cover Plate 3 Module", "NOS", 1),
  ]),
  activity("act-p6", "ACT-P-0006", "Calling bell point with bell push", "POINT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Phase)", "MTR", 6),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Neutral)", "MTR", 6),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 5),
    req("cat-switch", "Bell Push - 1 Module", "NOS", 1),
    req("cat-metalbox", "GI Flush Box 1/2 Module", "NOS", 1),
    req("cat-coverframe", "Cover Plate 1/2 Module", "NOS", 1),
  ]),
  activity("act-c1", "ACT-C-0001", "Lighting circuit wiring (2 x 1.5 + 1 x 1.5 Earth)", "CIRCUIT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Phase)", "MTR", 15),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Neutral)", "MTR", 15),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Earth)", "MTR", 15),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 12),
  ]),
  activity("act-c2", "ACT-C-0002", "6A socket circuit wiring (2 x 2.5 + 1 x 1.5 Earth)", "CIRCUIT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Phase)", "MTR", 18),
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Neutral)", "MTR", 18),
    req("cat-wire", "FR Copper Wire 1.5 sq.mm (Earth)", "MTR", 18),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 14),
  ]),
  activity("act-c3", "ACT-C-0003", "16A power circuit wiring (2 x 2.5 + Earth)", "CIRCUIT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Phase)", "MTR", 20),
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Neutral)", "MTR", 20),
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Earth)", "MTR", 20),
    req("cat-pvcconduit", "PVC Conduit 25mm Medium Duty", "MTR", 15),
  ]),
  activity("act-c4", "ACT-C-0004", "AC circuit wiring (2 x 4 + 1 x 2.5 Earth)", "CIRCUIT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 4 sq.mm (Phase)", "MTR", 18),
    req("cat-wire", "FR Copper Wire 4 sq.mm (Neutral)", "MTR", 18),
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Earth)", "MTR", 18),
    req("cat-pvcconduit", "PVC Conduit 25mm Medium Duty", "MTR", 14),
  ]),
  activity("act-c5", "ACT-C-0005", "Geyser circuit wiring (2 x 2.5 + Earth)", "CIRCUIT_WIRING", "RESIDENTIAL", [
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Phase)", "MTR", 16),
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Neutral)", "MTR", 16),
    req("cat-wire", "FR Copper Wire 2.5 sq.mm (Earth)", "MTR", 16),
    req("cat-pvcconduit", "PVC Conduit 20mm Medium Duty", "MTR", 12),
  ]),
];

// ── Demo users for local login ──
export const SEED_USERS = [
  { id: "user-super", username: "superadmin", password: "Admin@123", firstName: "Super", lastName: "Admin", role: "SUPERADMIN" },
  { id: "user-admin", username: "admin", password: "Admin@123", firstName: "System", lastName: "Admin", role: "ADMIN" },
  { id: "user-staff", username: "staff", password: "Admin@123", firstName: "Staff", lastName: "User", role: "STAFF" },
];
