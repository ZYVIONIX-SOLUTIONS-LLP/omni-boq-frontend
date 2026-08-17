"use client";

import { Quotation, getQuotation, updateQuotation } from "./quotations";

export interface ProjectRevision {
  id: string;
  revisionNumber: number; // 0 for Original Baseline, 1, 2, 3... for Rate Revisions
  revisionNote: string;
  createdAt: string;
  items: any[];
  subTotal: number;
  taxTotal: number;
  grandTotal: number;
  activityRows?: Record<number, string>;
  activityCustomizations?: Record<number, Record<string, string>>;
  brandPreferences?: Record<string, any>;
  isLatest: boolean;
}

export interface Project {
  id: string;
  code: string; // e.g. PRJ-2026-001
  quotationId: string;
  quotationCode: string;
  title: string;
  clientName: string;
  grandTotal: number;
  status: "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
  convertedAt: string;
  isManualEditEnabled?: boolean;
  activeRevisionId?: string;
  revisions: ProjectRevision[];
}

const PROJECTS_STORAGE_KEY = "omni_converted_projects";

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to read projects from storage", e);
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error("Failed to save projects to storage", e);
  }
}

export function clearAllProjectsData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROJECTS_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear projects from storage", e);
  }
}

export function getProjectById(projectId: string): Project | null {
  const projects = getProjects();
  return projects.find((p) => p.id === projectId || p.quotationId === projectId) || null;
}

export function convertQuotationToProject(quotation: Quotation): Project {
  const currentProjects = getProjects();
  
  // Check if already converted
  const existing = currentProjects.find((p) => p.quotationId === quotation.id);
  if (existing) {
    return existing;
  }

  const projectCount = currentProjects.length + 1;
  const projectCode = `PRJ-${new Date().getFullYear()}-${String(projectCount).padStart(3, "0")}`;

  const initialItems = (quotation.items || []).map((it: any, idx: number) => ({
    id: it.id || `prj-item-${idx}`,
    description: it.description,
    unit: it.unit || "NOS",
    quantity: Number(it.quantity) || 0,
    rate: Number(it.rate) || 0,
    discountPct: Number(it.discountPct) || 0,
    profitPct: Number(it.profitPct) || 0,
    taxRate: Number(it.taxRate) || 0,
    amount: Number(it.amount) || 0,
    sortOrder: it.sortOrder ?? idx,
    snapshotData: it.snapshotData || {},
  }));

  const baselineRevision: ProjectRevision = {
    id: `rev-0-${Date.now()}`,
    revisionNumber: 0,
    revisionNote: `Original Approved Baseline (${quotation.code || "QUO"})`,
    createdAt: new Date().toISOString(),
    items: initialItems,
    subTotal: Number(quotation.subTotal) || 0,
    taxTotal: Number(quotation.taxTotal) || 0,
    grandTotal: Number(quotation.grandTotal) || 0,
    activityRows: quotation.activityRows || {},
    activityCustomizations: quotation.activityCustomizations || {},
    brandPreferences: quotation.brandPreferences || {},
    isLatest: true,
  };

  const newProject: Project = {
    id: `prj-${Date.now()}`,
    code: projectCode,
    quotationId: quotation.id,
    quotationCode: quotation.code || `QUO-${quotation.id.slice(0, 6)}`,
    title: quotation.project?.name || (quotation as any).title || "Untitled Project",
    clientName: quotation.customer?.name || (quotation as any).clientName || "Direct Client",
    grandTotal: Number(quotation.grandTotal) || 0,
    status: "IN_PROGRESS",
    convertedAt: new Date().toISOString(),
    isManualEditEnabled: false,
    activeRevisionId: baselineRevision.id,
    revisions: [baselineRevision],
  };

  const updatedProjects = [newProject, ...currentProjects];
  saveProjects(updatedProjects);

  // Update Quotation state on backend / storage
  try {
    updateQuotation(quotation.id, {
      status: "ACCEPTED", // Ensure accepted
      sheetData: {
        ...((quotation.sheetData as any) || {}),
        isConvertedToProject: true,
        projectId: newProject.id,
        projectCode: newProject.code,
        convertedAt: newProject.convertedAt,
        allowManualEdit: false,
      },
    }).catch(console.error);
  } catch (e) {
    console.error("Failed to update quotation project status", e);
  }

  return newProject;
}

export function addProjectRevision(
  projectId: string,
  payload: {
    revisionNote: string;
    items: any[];
    subTotal: number;
    taxTotal: number;
    grandTotal: number;
    activityRows?: Record<number, string>;
    activityCustomizations?: Record<number, Record<string, string>>;
    brandPreferences?: Record<string, any>;
  }
): { project: Project; revision: ProjectRevision } | null {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === projectId || p.quotationId === projectId);
  if (idx === -1) return null;

  const project = projects[idx];
  const revisions = project.revisions || [];
  
  // Mark previous revisions as not latest
  const updatedRevisions = revisions.map((r) => ({ ...r, isLatest: false }));

  const nextRevNum = revisions.length;
  const newRevision: ProjectRevision = {
    id: `rev-${nextRevNum}-${Date.now()}`,
    revisionNumber: nextRevNum,
    revisionNote: payload.revisionNote || `Rate Revision Rev ${nextRevNum} on ${new Date().toLocaleDateString("en-IN")}`,
    createdAt: new Date().toISOString(),
    items: payload.items,
    subTotal: payload.subTotal,
    taxTotal: payload.taxTotal,
    grandTotal: payload.grandTotal,
    activityRows: payload.activityRows || project.revisions[0]?.activityRows || {},
    activityCustomizations: payload.activityCustomizations || project.revisions[0]?.activityCustomizations || {},
    brandPreferences: payload.brandPreferences || project.revisions[0]?.brandPreferences || {},
    isLatest: true,
  };

  updatedRevisions.unshift(newRevision);

  project.revisions = updatedRevisions;
  project.activeRevisionId = newRevision.id;
  project.grandTotal = payload.grandTotal;

  projects[idx] = project;
  saveProjects(projects);

  return { project, revision: newRevision };
}

export function updateProjectStatus(projectId: string, status: "IN_PROGRESS" | "COMPLETED" | "ON_HOLD"): Project | null {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === projectId || p.quotationId === projectId);
  if (idx === -1) return null;

  projects[idx].status = status;
  saveProjects(projects);
  return projects[idx];
}

export function setProjectManualEdit(quotationId: string, enabled: boolean): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.quotationId === quotationId || p.id === quotationId);
  if (idx !== -1) {
    projects[idx].isManualEditEnabled = enabled;
    saveProjects(projects);
  }
}
