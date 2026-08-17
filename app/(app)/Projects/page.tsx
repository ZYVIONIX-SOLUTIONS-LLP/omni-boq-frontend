"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, FolderPlus, Plus, Search, ExternalLink, CheckCircle2, Clock, PauseCircle, RefreshCw, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getProjects, updateProjectStatus, convertQuotationToProject, clearAllProjectsData, Project } from "@/app/lib/api/projects";
import { listQuotations, getDisplayStatus, Quotation } from "@/app/lib/api/quotations";
import Swal from "sweetalert2";

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Conversion Dialog State
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const projList = getProjects();
      setProjects(projList);

      const qRes = await listQuotations({ limit: 500 });
      setQuotations(qRes.items || []);
    } catch (e) {
      console.error("Failed to load projects/quotations", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter accepted quotations eligible for conversion
  const acceptedQuotations = quotations.filter((q) => {
    const status = getDisplayStatus(q);
    const isAccepted = status === "ACCEPTED" || q.status === "ACCEPTED";
    const alreadyConverted = projects.some((p) => p.quotationId === q.id);
    return isAccepted && !alreadyConverted;
  });

  const handleConvert = (q: Quotation) => {
    Swal.fire({
      title: "Convert Quotation to Project?",
      text: `Convert accepted quotation ${q.code || ""} into an active Project?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Convert to Project",
    }).then((res) => {
      if (res.isConfirmed) {
        const createdProject = convertQuotationToProject(q);
        setConvertDialogOpen(false);
        loadData();
        Swal.fire("Project Created!", `Project ${createdProject.code} is now active.`, "success");
      }
    });
  };

  const handleClearProjects = () => {
    Swal.fire({
      title: "Clear All Projects Data?",
      text: "This will remove any stale test project entries from storage. Actual backend quotations will remain safe.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d97706",
      confirmButtonText: "Yes, Clear Projects",
    }).then((res) => {
      if (res.isConfirmed) {
        clearAllProjectsData();
        loadData();
        Swal.fire("Cleared", "All project data cleared successfully.", "success");
      }
    });
  };

  const handleStatusChange = (projectId: string, newStatus: "IN_PROGRESS" | "COMPLETED" | "ON_HOLD") => {
    updateProjectStatus(projectId, newStatus);
    setProjects(getProjects());
  };

  const filteredProjects = projects.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.code.toLowerCase().includes(term) ||
      p.quotationCode.toLowerCase().includes(term) ||
      p.title.toLowerCase().includes(term) ||
      p.clientName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-700" />
            Projects Workspace
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Converted active projects baseline, BOQ tracking, and execution status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            className="h-9 w-9 rounded-none border-purple-200 text-slate-700 hover:bg-purple-50"
            title="Refresh Projects"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleClearProjects}
            className="h-9 text-xs font-semibold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-none shadow-xs"
            title="Clear stale test projects data"
          >
            Clear Test Data
          </Button>
          <Button
            onClick={() => setConvertDialogOpen(true)}
            size="sm"
            className="h-9 gap-1.5 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-none shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            + Convert Accepted Quotation to Project
          </Button>
        </div>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search project code, title, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-white border-purple-200 rounded-none font-medium"
          />
        </div>
        <div className="text-xs font-bold text-slate-600 bg-white border border-purple-200 px-3 py-1.5 rounded-none shadow-2xs">
          Active Projects: <span className="text-purple-700 font-extrabold">{projects.length}</span>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredProjects.length === 0 ? (
        <Card className="p-10 border-purple-200/80 bg-white/80 shadow-md text-center flex flex-col items-center justify-center min-h-[380px] rounded-none">
          <div className="w-16 h-16 rounded-full bg-purple-100/70 border border-purple-200 flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-purple-700" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No Active Projects</h2>
          <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
            Projects are created exclusively by converting Accepted Quotations. Once a client approves a quotation, convert it into a project to lock its BOQ baseline.
          </p>
          <Button
            onClick={() => setConvertDialogOpen(true)}
            size="sm"
            className="h-9 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-none shadow-md gap-1.5"
          >
            <FolderPlus className="w-4 h-4" /> Convert Accepted Quotation
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="p-5 bg-white border border-purple-200 hover:border-purple-400 rounded-none shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                    {project.code}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Ref: {project.quotationCode}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                    {project.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Client: <span className="font-semibold text-slate-700">{project.clientName}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      BOQ Total Value
                    </span>
                    <span className="text-sm font-black text-emerald-600">
                      ₹{project.grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Converted Date
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {new Date(project.convertedAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="pt-3 border-t border-purple-100 flex items-center justify-between gap-2">
                <Select
                  value={project.status}
                  onValueChange={(val: any) => handleStatusChange(project.id, val)}
                >
                  <SelectTrigger className="h-8 text-xs font-bold bg-slate-50 border-purple-200 rounded-none w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-purple-200 text-xs font-semibold">
                    <SelectItem value="IN_PROGRESS" className="text-blue-600 font-bold">
                      In Progress
                    </SelectItem>
                    <SelectItem value="COMPLETED" className="text-emerald-600 font-bold">
                      Completed
                    </SelectItem>
                    <SelectItem value="ON_HOLD" className="text-amber-600 font-bold">
                      On Hold
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => router.push(`/Projects/${project.id}`)}
                  size="sm"
                  className="h-8 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-none shadow-xs gap-1 cursor-pointer"
                >
                  View Project <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convert Quotation to Project Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-[650px] bg-white border border-purple-200 shadow-2xl p-6 rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Briefcase className="h-5 w-5 text-purple-700" />
              Convert Accepted Quotation to Active Project
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select an accepted quotation below to convert it into an active Project. Once converted, the quotation will be locked in Read-Only mode to preserve project baseline details.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {acceptedQuotations.length === 0 ? (
              <div className="p-6 bg-purple-50/60 border border-purple-200 text-center space-y-3">
                <FileText className="w-8 h-8 text-purple-400 mx-auto" />
                <p className="text-xs font-bold text-purple-900">
                  No Unconverted Accepted Quotations Found
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Only quotations with <span className="font-bold text-emerald-700">ACCEPTED</span> status can be converted into active projects. Accept a quotation first in the Quotation module.
                </p>
                <Button
                  onClick={() => {
                    setConvertDialogOpen(false);
                    router.push("/Quotations");
                  }}
                  size="sm"
                  className="h-8 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-none shadow-sm gap-1"
                >
                  Go to Quotations <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              acceptedQuotations.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 bg-white border border-purple-200 hover:border-purple-400 rounded-none shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-purple-900">
                        {q.code || `QUO-${q.id.slice(0, 6)}`}
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300 uppercase">
                        ACCEPTED
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {q.project?.name || (q as any).title || "Untitled Quotation"}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Client: {q.customer?.name || (q as any).clientName || "Direct Client"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Amount
                      </span>
                      <span className="text-xs font-black text-emerald-600">
                        ₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleConvert(q)}
                      size="sm"
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-none shadow-2xs gap-1"
                    >
                      Convert <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)} className="rounded-none text-xs border-slate-300">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
