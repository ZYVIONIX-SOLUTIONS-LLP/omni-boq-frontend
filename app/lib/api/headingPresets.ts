"use client";

import { getUser } from "@/app/lib/auth-storage";

export interface HeadingPreset {
  id: string;
  title: string;
  description: string;
  category?: string;
  isGlobal?: boolean;
  tenantId?: string | null;
  createdAt: string;
}

const STORAGE_KEY = "omni_heading_presets";

export const DEFAULT_HEADING_PRESETS: HeadingPreset[] = [
  {
    id: "preset-lighting-points",
    title: "Lighting Points/Fan Points",
    description: "<p><strong>Lighting Points/Fan Points</strong></p><p>Supply and Carrying out wiring for lights,fan and plug points including testing and commissioning in surface/concealed conduit system from control board to luminaries / Fans / Plug points using single core FRLSH PVC insulated stranded 1.1kV grade copper wire of size 1.5 sq.mm along with same size wire as earth continuity conductor through medium/light duty FRLS PVC rigid conduit with necessary flexible conduits, bends, junction boxes and 6A modular type switches on GI metal boxes complete with ceiling roses, plugs etc. The rate shall include laying conduit in concrete, chipping walls,concrete floors,beams etc.and making good smooth plastering with cement mortar, plugs,making holes using drilling machine etc. Measurement shall be considered from switch board upto light point(upto 5mtr )Switch boards shall be marked for UPS/RAW power using premium quality stickers.</p>",
    category: "Wiring & Points",
    isGlobal: true,
    tenantId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-socket-points",
    title: "Socket Points",
    description: "<p><strong>Socket Points</strong></p><p>Supply & Fixing of following modular type power switches & sockets in standard metal boxes on surface/concealed on wall including modular plate and cover and giving connections complete.The rate shall include chipping walls,concrete floors,beams etc.and making good with cement mortar, plugs,making holes using drilling machine etc.Switch boards shall be marked for UPS/RAW power using premium quality stickers.</p>",
    category: "Wiring & Points",
    isGlobal: true,
    tenantId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-circuit-wiring",
    title: "Lighting Circuit/Power Circuit",
    description: "<p><strong>Lighting Circuit/Power Circuit</strong></p><p>Supply and Wiring from DBs to switch boards and looping between switchboards using following 2 runs of single core class 2 FRLSH PVC insulated 1.1kV grade copper wire along with same size copper wire as earth conductor through medium/light duty FRLS PVC rigid Conduit in concealed system with necessary flexible conduits, bends, junction boxes. The rate shall include laying conduit in concrete,chipping walls,concrete floors,beams etc.and making good smooth plastering with cement mortar, plugs,making holes using drilling machine etc.</p>",
    category: "Circuits & DBs",
    isGlobal: true,
    tenantId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-distribution-boards",
    title: "Distribution Boards & Switchgears",
    description: "<p><strong>Distribution Boards & Switchgears</strong></p><p>Supply, installation, testing and commissioning of surface / flush mounting MCB Distribution Boards complete with bus bars, neutral links, earth bar, interconnecting wire, DIN channel, and all standard accessories. Rated for 415V/240V 50Hz supply.</p>",
    category: "Circuits & DBs",
    isGlobal: true,
    tenantId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-earthing-protection",
    title: "Earthing & Lightning Protection System",
    description: "<p><strong>Earthing & Lightning Protection System</strong></p><p>Supply, installation, testing and commissioning of chemical earthing pit / GI pipe earthing including copper/GI earth strips, watering arrangement, brick masonry chamber with CI cover, and testing pit as per IS 3043 standards.</p>",
    category: "Protection & Earthing",
    isGlobal: true,
    tenantId: null,
    createdAt: new Date().toISOString(),
  }
];

export function getHeadingPresets(): HeadingPreset[] {
  if (typeof window === "undefined") return DEFAULT_HEADING_PRESETS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HEADING_PRESETS));
      return DEFAULT_HEADING_PRESETS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading heading presets", e);
    return DEFAULT_HEADING_PRESETS;
  }
}

export function saveHeadingPresets(presets: HeadingPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error("Error saving heading presets", e);
  }
}

export function addHeadingPreset(preset: Omit<HeadingPreset, "id" | "createdAt">): HeadingPreset {
  const current = getHeadingPresets();
  const user = getUser();
  const isSuperAdmin = !!(user?.roles?.includes("SUPERADMIN") || (user as any)?.role === "SUPERADMIN");

  const newPreset: HeadingPreset = {
    ...preset,
    id: `preset-${Date.now()}`,
    isGlobal: isSuperAdmin,
    tenantId: isSuperAdmin ? null : ((user as any)?.tenantId || "local-tenant"),
    createdAt: new Date().toISOString(),
  };
  const updated = [newPreset, ...current];
  saveHeadingPresets(updated);
  return newPreset;
}

export function deleteHeadingPreset(id: string): boolean {
  const current = getHeadingPresets();
  const target = current.find((p) => p.id === id);
  if (!target) return false;

  const user = getUser();
  const isSuperAdmin = !!(user?.roles?.includes("SUPERADMIN") || (user as any)?.role === "SUPERADMIN");

  // Admin cannot delete SuperAdmin global items
  if (target.isGlobal && !isSuperAdmin) {
    return false;
  }

  const updated = current.filter((p) => p.id !== id);
  saveHeadingPresets(updated);
  return true;
}
