"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { getHeadingPresets, addHeadingPreset, deleteHeadingPreset, HeadingPreset } from "@/app/lib/api/headingPresets";
import { getActivityTypes, ActivityType } from "@/app/lib/api/activities";
import { getUser } from "@/app/lib/auth-storage";
import { Plus, Trash2, BookOpen, Check, Lock, ShieldCheck, User, Sparkles } from "lucide-react";

interface HeadingPresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPreset?: (preset: HeadingPreset) => void;
}

export function HeadingPresetsDialog({
  open,
  onOpenChange,
  onSelectPreset,
}: HeadingPresetsDialogProps) {
  const [presets, setPresets] = useState<HeadingPreset[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [newDescription, setNewDescription] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setPresets(getHeadingPresets());
      const u = getUser();
      setIsSuperAdmin(!!(u?.roles?.includes("SUPERADMIN") || (u as any)?.role === "SUPERADMIN"));

      // Fetch dynamic Activity Types & Categories
      getActivityTypes()
        .then((types) => setActivityTypes(types || []))
        .catch(console.error);
    }
  }, [open]);

  const selectedTypeObj = activityTypes.find((t) => t.id === selectedTypeId);
  const categoriesList = selectedTypeObj?.categories || [];

  const computedTitle = selectedCategoryName 
    ? `${selectedTypeObj?.name || ""} - ${selectedCategoryName}` 
    : (selectedTypeObj?.name || "");

  const handleCreate = () => {
    if (!selectedTypeId || !selectedCategoryName) return;

    addHeadingPreset({
      title: computedTitle,
      category: selectedCategoryName,
      description: newDescription || `<p><strong>${computedTitle}</strong></p>`,
    });

    setPresets(getHeadingPresets());
    setSelectedTypeId("");
    setSelectedCategoryName("");
    setNewDescription("");
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = deleteHeadingPreset(id);
    if (success) {
      setPresets(getHeadingPresets());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] bg-white border border-purple-200 shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <BookOpen className="h-5 w-5 text-purple-700" />
            Preset Activity Headings & Specification Templates
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Select a pre-saved heading specification template to insert into your quotation, or add new detailed specification templates by activity type and category.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {isAdding ? (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-none space-y-4">
              <div className="flex justify-between items-center border-b border-purple-200/80 pb-2">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-purple-700" />
                  Create New {isSuperAdmin ? "Global (SuperAdmin)" : "Tenant"} Heading Template
                </h4>
                {isSuperAdmin ? (
                  <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-700" /> Global Template
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded uppercase flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-700" /> My Tenant Template
                  </span>
                )}
              </div>

              {/* Type and Category Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Activity Type *
                  </label>
                  <Select
                    value={selectedTypeId}
                    onValueChange={(val) => {
                      setSelectedTypeId(val || "");
                      setSelectedCategoryName("");
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white border-purple-200 rounded-none font-semibold">
                      <SelectValue placeholder="Select Activity Type..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-purple-200">
                      {activityTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id} className="text-xs font-semibold cursor-pointer">
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Activity Category *
                  </label>
                  <Select
                    value={selectedCategoryName}
                    onValueChange={(val) => setSelectedCategoryName(val || "")}
                    disabled={!selectedTypeId || categoriesList.length === 0}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white border-purple-200 rounded-none font-semibold">
                      <SelectValue placeholder={!selectedTypeId ? "Select Type First" : categoriesList.length === 0 ? "No Categories" : "Select Category..."} />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-purple-200">
                      {categoriesList.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name} className="text-xs font-semibold cursor-pointer">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto-derived Title Badge */}
              {computedTitle && (
                <div className="px-3 py-1.5 bg-purple-100/80 border border-purple-200 text-purple-900 text-xs font-bold flex items-center justify-between">
                  <span>Generated Heading Title:</span>
                  <span className="font-extrabold text-purple-950">{computedTitle}</span>
                </div>
              )}

              {/* Detailed Specification Rich Text Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Detailed Specification Text (HTML Rich Text) *
                </label>
                <RichTextEditor
                  content={newDescription}
                  onChange={setNewDescription}
                  placeholder="Enter detailed BOQ technical specification text..."
                  className="min-h-[140px] bg-white text-xs border border-purple-200 rounded-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)} className="rounded-none text-xs">
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCreate} 
                  disabled={!selectedTypeId || !selectedCategoryName || !newDescription.trim()} 
                  className="rounded-none bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md"
                >
                  Save Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center pb-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Saved Templates ({presets.length})
              </span>
              <Button
                onClick={() => setIsAdding(true)}
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 rounded-none font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Create Template
              </Button>
            </div>
          )}

          {!isAdding && (
            <div className="space-y-2.5">
              {presets.map((preset) => {
                const canModify = isSuperAdmin || !preset.isGlobal;

                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      if (onSelectPreset) {
                        onSelectPreset(preset);
                        onOpenChange(false);
                      }
                    }}
                    className={`p-3 bg-white border border-purple-200/90 hover:border-purple-400 hover:bg-purple-50/40 rounded-none shadow-2xs transition-all ${
                      onSelectPreset ? "cursor-pointer group" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-purple-950 group-hover:text-purple-700">
                            {preset.title}
                          </span>
                          {preset.isGlobal ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded uppercase flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5 text-amber-700" /> Global (SuperAdmin)
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded uppercase flex items-center gap-1">
                              <User className="w-2.5 h-2.5 text-blue-700" /> Tenant Template
                            </span>
                          )}
                          {preset.category && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded border border-purple-200 uppercase">
                              {preset.category}
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed prose prose-xs max-w-none"
                          dangerouslySetInnerHTML={{ __html: preset.description }}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        {onSelectPreset && (
                          <Button
                            size="sm"
                            className="h-7 text-[11px] bg-purple-700 hover:bg-purple-800 text-white font-bold gap-1 rounded-none shadow-2xs"
                          >
                            <Check className="w-3 h-3" /> Select
                          </Button>
                        )}
                        {canModify ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(preset.id, e)}
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none"
                            title="Delete template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <div 
                            className="h-7 w-7 flex items-center justify-center text-slate-300 cursor-not-allowed"
                            title="Global template created by SuperAdmin (Read-Only for Admin)"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-none text-xs border-slate-300">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
