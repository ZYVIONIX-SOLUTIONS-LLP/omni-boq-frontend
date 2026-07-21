// Shared primitive types used across the api/* modules. Split out of the old
// (now-deleted) materials.ts, which had zero live UI consumers beyond this type.
export const UNITS = ["NOS", "MTR", "SQFT", "SET", "ROLL", "KG", "LTR", "LOT"] as const;
export type UnitOfMeasure = (typeof UNITS)[number];
