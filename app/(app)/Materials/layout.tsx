"use client";

// The global catalog hierarchy (Manufacturers/Series/Categories/Units & Tax) is
// managed exclusively by SuperAdmin (see app/superadmin/Materials/*). Admin/Staff
// only ever see Product Library here, so this layout is just a pass-through.

export default function MaterialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
