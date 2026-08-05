"use client";

import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "@/app/lib/api/activities";

interface ActivitySelectionSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  onAddSelected: (selectedActivities: Activity[]) => void;
  categoryName: string;
}

export function ActivitySelectionSidebar({
  open,
  onOpenChange,
  activities,
  onAddSelected,
  categoryName,
}: ActivitySelectionSidebarProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear selections when closed
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  const handleToggle = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleAdd = () => {
    const selected = activities.filter((a) => selectedIds.has(a.id));
    onAddSelected(selected);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-slate-50 border-l border-slate-200 shadow-xl">
        <SheetHeader className="px-6 py-5 bg-white border-b border-slate-100 flex-shrink-0">
          <SheetTitle className="text-lg font-bold text-slate-800">Select Activities</SheetTitle>
          <SheetDescription className="text-sm font-medium text-slate-500">
            {categoryName}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500 font-medium bg-white rounded-xl border border-slate-100 border-dashed">
                No activities found for this category.
              </div>
            ) : (
              activities.map((activity) => (
                <label
                  key={activity.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedIds.has(activity.id)
                      ? "bg-emerald-50/50 border-emerald-200 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm hover:shadow"
                  }`}
                >
                  <div className="pt-0.5">
                    <Checkbox
                      checked={selectedIds.has(activity.id)}
                      onCheckedChange={(checked) => handleToggle(activity.id, !!checked)}
                      className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{activity.name}</p>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {activity.description || "No description provided"}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                       <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                         {activity.code}
                       </span>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0 mt-auto">
          <Button
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold h-11 rounded-xl transition-all disabled:opacity-50 disabled:shadow-none"
          >
            Add Selected to Quotation ({selectedIds.size})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
