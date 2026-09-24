// Shared AG Grid setup ?" one place to register community modules and build a
// theme that matches the app's corporate brand, so every grid in the app (the
// Quotations list, the desktop-style line-item editor, future BOQ grids...)
// looks and behaves consistently without re-registering modules per file.

import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export const appGridTheme = themeQuartz.withParams({
  accentColor: "#163848",
  borderColor: "#e2e8f0",
  browserColorScheme: "light",
  fontFamily: "inherit",
  fontSize: 12,
  headerFontWeight: 700,
  headerBackgroundColor: "#f1f5f9",
  headerTextColor: "#163848",
  oddRowBackgroundColor: "#ffffff",
  rowHoverColor: "#f8fafc",
  selectedRowBackgroundColor: "#f1f5f9",
  wrapperBorderRadius: 0,
  borderRadius: 0,
  spacing: 8,
  rowHeight: 44,
  headerHeight: 40,
});
