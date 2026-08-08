"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ActivityType, getActivityTypes, createActivityType, deleteActivityType, createActivityCategory, deleteActivityCategory } from "@/app/lib/api/activities";
import { Trash2, Plus, Lock, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getUser } from "@/app/lib/auth-storage";

export default function ActivityTypesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTypeName, setNewTypeName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currentUser = getUser();
  const isSuperAdmin = currentUser?.roles?.includes("SUPERADMIN");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getActivityTypes();
      setTypes(res);
      if (res.length > 0 && !selectedTypeId) {
        setSelectedTypeId(res[0].id);
      }
    } catch (err) {
      setError("Failed to load types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createActivityType(newTypeName.trim());
      setNewTypeName("");
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to create type");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteType = async (t: ActivityType) => {
    const isGlobal = !t.tenantId;
    if (isGlobal && !isSuperAdmin) {
      setError("Global types are created by SuperAdmin and cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${t.name}"? This will fail if any activities are using it.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteActivityType(t.id);
      if (selectedTypeId === t.id) setSelectedTypeId(null);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete type");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId || !newCategoryName.trim()) return;
    
    if (selectedType && !selectedType.tenantId && !isSuperAdmin) {
      setError("Categories for Global Types can only be created by SuperAdmin.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await createActivityCategory(selectedTypeId, newCategoryName.trim());
      setNewCategoryName("");
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to create category");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (c: { id: string; name: string; tenantId?: string | null }) => {
    const isGlobal = !c.tenantId;
    if (isGlobal && !isSuperAdmin) {
      setError("Global categories are created by SuperAdmin and cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete category "${c.name}"? This will fail if any activities are using it.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteActivityCategory(c.id);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete category");
    } finally {
      setBusy(false);
    }
  };

  const selectedType = types.find(t => t.id === selectedTypeId);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] w-[900px] h-[680px] flex flex-col rounded-none border border-purple-200 bg-white shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b border-purple-100 bg-purple-50/40">
          <DialogTitle className="text-xl font-bold text-slate-900">Manage Types & Categories</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure dynamic activity types and categories. {isSuperAdmin ? "SuperAdmin Access: Full Edit & Create Rights." : "Global items created by SuperAdmin are protected."}
          </DialogDescription>
        </DialogHeader>

        {error && <div className="mx-6 mt-3 p-2 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-none">{error}</div>}

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Types */}
          <div className="w-80 shrink-0 bg-purple-50/20 border-r border-purple-100 flex flex-col">
            <div className="p-3.5 border-b border-purple-100 flex gap-2 bg-white">
              <Input 
                placeholder="Add New Type..." 
                className="h-9 text-xs bg-white rounded-none border-purple-200 focus-visible:ring-purple-500 flex-1" 
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateType()}
              />
              <Button size="sm" className="h-9 px-3 rounded-none bg-purple-700 hover:bg-purple-800 text-white font-semibold" onClick={handleCreateType} disabled={busy || !newTypeName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-500 font-medium">Loading types...</div>
              ) : types.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No types found</div>
              ) : (
                <div className="p-2 space-y-1">
                  {types.map(t => {
                    const isGlobal = !t.tenantId;
                    const canDelete = isSuperAdmin || !isGlobal;

                    return (
                      <div 
                        key={t.id}
                        className={`flex items-center justify-between p-2.5 rounded-none border border-transparent transition-all cursor-pointer text-xs ${
                          selectedTypeId === t.id 
                            ? 'bg-purple-100/80 border-purple-300 text-purple-950 font-bold shadow-2xs' 
                            : 'hover:bg-purple-50/60 text-slate-700'
                        }`}
                        onClick={() => setSelectedTypeId(t.id)}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{t.name}</span>
                          {isGlobal && (
                            <span className="shrink-0 text-[9px] font-extrabold text-purple-700 bg-purple-100 px-1 py-0.2 border border-purple-200 uppercase" title="Global Item (SuperAdmin)">
                              Global
                            </span>
                          )}
                        </div>

                        {canDelete ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteType(t); }} disabled={busy}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        ) : (
                          <span title="Protected Global Item">
                            <Lock className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Main - Categories */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedType ? (
              <>
                <div className="p-4 border-b border-purple-100 bg-purple-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-purple-950 flex items-center gap-1.5">
                      {selectedType.name} Categories
                      {!selectedType.tenantId && (
                        <span className="text-[9px] font-extrabold text-purple-700 bg-purple-100 px-1.5 py-0.5 border border-purple-200">
                          Global Type
                        </span>
                      )}
                    </h3>
                  </div>

                  {!selectedType.tenantId && !isSuperAdmin ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 border border-amber-200 font-medium">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      Global category structure is managed by SuperAdmin.
                    </div>
                  ) : (
                    <form onSubmit={handleCreateCategory} className="flex gap-2">
                      <Input 
                        placeholder="Add new category..." 
                        className="h-9 text-xs bg-white rounded-none border-purple-200 focus-visible:ring-purple-500" 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                      />
                      <Button type="submit" size="sm" className="h-9 px-4 rounded-none bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs" disabled={busy || !newCategoryName.trim()}>
                        Add
                      </Button>
                    </form>
                  )}
                </div>
                <ScrollArea className="flex-1 p-4">
                  {selectedType.categories.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 mt-10">No categories under this type.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {selectedType.categories.map(c => {
                        const isGlobalCat = !c.tenantId;
                        const canDeleteCat = isSuperAdmin || !isGlobalCat;

                        return (
                          <div key={c.id} className="flex items-center justify-between p-3 border border-purple-100 rounded-none bg-white hover:border-purple-300 transition-colors shadow-2xs">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                              {isGlobalCat && (
                                <span className="text-[9px] font-extrabold text-purple-700 bg-purple-100 px-1 py-0.2 border border-purple-200 uppercase">
                                  Global
                                </span>
                              )}
                            </div>

                            {canDeleteCat ? (
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none" onClick={() => handleDeleteCategory(c)} disabled={busy}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <span title="Protected Global Category">
                                <Lock className="h-3.5 w-3.5 text-slate-400" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Select a type to view its categories.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
