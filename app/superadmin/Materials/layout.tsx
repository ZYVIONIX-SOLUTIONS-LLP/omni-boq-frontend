"use client";

// Sub-navigation for the Materials module. The sidebar keeps its single
// "Materials" entry; everything catalog-related lives behind these tabs.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { label: "Product Library", href: "/superadmin/Materials", exact: true },
  { label: "Manufacturers", href: "/superadmin/Materials/manufacturers" },
  { label: "Series", href: "/superadmin/Materials/series" },
  { label: "Categories", href: "/superadmin/Materials/categories" },
  { label: "Units & Tax", href: "/superadmin/Materials/settings" },
];

export default function MaterialsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="sticky top-0 z-10 bg-[#f8f7ff]/95 backdrop-blur border-b border-border px-7">
        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {TABS.map((tab) => {
            // "Product Library" also stays active on /Materials/new (the wizard)
            const isActive = tab.exact
              ? pathname === tab.href || pathname.startsWith("/superadmin/Materials/new")
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all",
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:text-primary hover:bg-white"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
