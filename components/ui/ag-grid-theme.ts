// Shared AG Grid setup — one place to register community modules and build a
// theme that matches the app's purple brand, so every grid in the app (the
// Quotations list, the desktop-style line-item editor, future BOQ grids...)
// looks and behaves consistently without re-registering modules per file.

import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export const appGridTheme = themeQuartz.withParams({
  accentColor: "#6c63ff",
  borderColor: "#e5e3fb",
  browserColorScheme: "light",
  fontFamily: "inherit",
  fontSize: 13,
  headerFontWeight: 700,
  headerBackgroundColor: "#f8f7ff",
  headerTextColor: "#3f3d56",
  oddRowBackgroundColor: "#fafaff",
  rowHoverColor: "#f1f0ff",
  selectedRowBackgroundColor: "#ece9ff",
  wrapperBorderRadius: 16,
  spacing: 8,
});
