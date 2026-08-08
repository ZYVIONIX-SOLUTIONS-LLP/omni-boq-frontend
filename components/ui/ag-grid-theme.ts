// Shared AG Grid setup — one place to register community modules and build a
// theme that matches the app's purple brand, so every grid in the app (the
// Quotations list, the desktop-style line-item editor, future BOQ grids...)
// looks and behaves consistently without re-registering modules per file.

import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export const appGridTheme = themeQuartz.withParams({
  accentColor: "#7c3aed",
  borderColor: "#e9d5ff",
  browserColorScheme: "light",
  fontFamily: "inherit",
  fontSize: 12,
  headerFontWeight: 700,
  headerBackgroundColor: "#f3e8ff",
  headerTextColor: "#3b0764",
  oddRowBackgroundColor: "#ffffff",
  rowHoverColor: "#faf5ff",
  selectedRowBackgroundColor: "#f3e8ff",
  wrapperBorderRadius: 0,
  borderRadius: 0,
  spacing: 8,
  rowHeight: 44,
  headerHeight: 40,
});
