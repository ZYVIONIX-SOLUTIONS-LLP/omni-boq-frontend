"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  createActivity, 
  getActivityTypes, 
  ActivityType,
  createActivityType,
  createActivityCategory
} from "@/app/lib/api/activities";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ActivityNewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") || "";

  const [types, setTypes] = useState<ActivityType[]>([]);
  const [name, setName] = useState(initialName);
  
  const [wiringType, setWiringType] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  
  // States for inline creation
  const [isCreatingType, setIsCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTypes = async () => {
    try {
      setLoading(true);
      const data = await getActivityTypes();
      setTypes(data);
      if (data.length > 0 && !wiringType) {
        setWiringType(data[0].name);
        if (data[0].categories.length > 0) {
          setCategory(data[0].categories[0].name);
        } else {
          setCategory("");
        }
      }
    } catch (err) {
      console.error("Failed to load types:", err);
      setError("Failed to load Activity Types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const handleWiringTypeChange = (val: string) => {
    setWiringType(val);
    const t = types.find(x => x.name === val);
    if (t && t.categories.length > 0) {
      setCategory(t.categories[0].name);
    } else {
      setCategory("");
    }
    setIsCreatingCategory(false);
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      setLoading(true);
      const newType = await createActivityType(newTypeName.trim());
      await loadTypes(); // Refresh list
      setWiringType(newType.name);
      setCategory("");
      setIsCreatingType(false);
      setNewTypeName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create type");
    } finally {
      setLoading(false);
    }
  };

  const currentType = types.find(t => t.name === wiringType);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !currentType) return;
    try {
      setLoading(true);
      const newCat = await createActivityCategory(currentType.id, newCategoryName.trim());
      await loadTypes(); // Refresh list to get the updated categories inside the type
      setCategory(newCat.name);
      setIsCreatingCategory(false);
      setNewCategoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Activity name is required");
      return;
    }
    if (!wiringType) {
      setError("Type is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const activity = await createActivity({
        name: name.trim(),
        wiringType,
        category,
        requirements: [],
      });
      // Redirect to edit page
      router.push(`/Activities/${activity.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create activity");
      setSaving(false);
    }
  };

  if (loading && types.length === 0) {
    return (
      <div className="flex h-[calc(100vh-0rem)] items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-0rem)] bg-slate-50/50 flex flex-col items-center py-10 px-4 w-full">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-purple-50/30 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create New Activity</h1>
            <p className="text-xs text-slate-500 mt-1">Configure the base details, then you'll proceed to the editor to add materials and rates.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()} className="rounded-xl h-8 text-xs font-semibold">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <Field label="Activity Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. One Light controlled by 6A switch"
              className="rounded-xl border-slate-200 h-11 focus-visible:ring-purple-500 font-medium text-slate-900"
            />
            {initialName && name === initialName && (
              <p className="text-[10px] text-purple-600 font-medium flex items-center gap-1 mt-1">
                <Plus className="w-3 h-3" /> Auto-filled from Tender Description
              </p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Activity Type">
              {isCreatingType ? (
                <div className="flex items-center gap-2">
                  <Input 
                    autoFocus
                    placeholder="New Type Name..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <Button size="sm" onClick={handleCreateType} disabled={loading || !newTypeName.trim()} className="h-10 rounded-xl bg-purple-600 text-white hover:bg-purple-700">Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsCreatingType(false)} className="h-10 rounded-xl">Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={wiringType}
                    onValueChange={(val) => val && handleWiringTypeChange(val)}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 h-10 bg-white flex-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-border">
                      {types.map(t => (
                        <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setIsCreatingType(true)} className="h-10 px-3 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Field>

            <Field label="Activity Category">
              {isCreatingCategory ? (
                <div className="flex items-center gap-2">
                  <Input 
                    autoFocus
                    placeholder="New Category Name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <Button size="sm" onClick={handleCreateCategory} disabled={loading || !newCategoryName.trim()} className="h-10 rounded-xl bg-purple-600 text-white hover:bg-purple-700">Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsCreatingCategory(false)} className="h-10 rounded-xl">Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select 
                    value={category} 
                    onValueChange={(val) => val && setCategory(val)}
                    disabled={!currentType}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 h-10 bg-white flex-1 disabled:opacity-50">
                      <SelectValue placeholder={currentType?.categories.length ? "Select category" : "No categories"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-border">
                      {currentType?.categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCreatingCategory(true)} 
                    disabled={!currentType}
                    className="h-10 px-3 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Field>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <Button
            variant="ghost"
            className="rounded-xl font-semibold text-slate-600 hover:text-slate-900"
            onClick={() => router.back()}
            disabled={saving || loading}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-purple-700 text-white hover:bg-purple-800 font-bold px-6 shadow-sm shadow-purple-200"
            onClick={submit}
            disabled={saving || !wiringType || !name.trim()}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
            ) : "Create & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ActivityNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-0rem)] items-center justify-center bg-slate-50 w-full">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      }
    >
      <ActivityNewPageInner />
    </Suspense>
  );
}
