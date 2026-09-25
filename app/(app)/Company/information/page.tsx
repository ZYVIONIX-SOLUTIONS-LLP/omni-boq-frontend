"use client";

import { useEffect, useState } from "react";
import { getUser, AuthUser, saveAuth, getAccessToken, getRefreshToken } from "@/app/lib/auth-storage";
import { updateProfile } from "@/app/lib/api/auth";
import Swal from 'sweetalert2';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Building2, Phone, FileText, MapPin, Save, Loader2, Plus, X,
  Mail, ChevronUp, ChevronDown, File, Settings, ChevronRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function Section({ title, subtitle, icon: Icon, colorClass, children, defaultOpen = false }: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm mb-4 transition-all">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 ${colorClass} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white/60 rounded-lg">
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs opacity-80">{subtitle}</p>
          </div>
        </div>
        <div>
          {isOpen ? <ChevronUp className="h-5 w-5 opacity-70" /> : <ChevronDown className="h-5 w-5 opacity-70" />}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [gst, setGst] = useState("");
  const [email, setEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  useEffect(() => {
    const currentUser = getUser();
    if (currentUser) {
      setUser(currentUser);
      setCompanyName(currentUser.companyName || "");
      setPhone(currentUser.phone || "");
      setGst(currentUser.gst || "");
      setEmail(currentUser.email || "");
      setCompanyAddress(currentUser.companyAddress || "");
      // @ts-ignore
      setCustomFields(currentUser.companyCustomFields || {});
    }
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      await updateProfile({
        companyName,
        phone,
        gst,
        companyAddress,
        companyCustomFields: customFields
      });

      const updatedUser = { 
        ...user, 
        companyName, 
        phone, 
        gst, 
        companyAddress,
        companyCustomFields: customFields 
      };
      saveAuth(updatedUser, getAccessToken()!, getRefreshToken()!);
      setUser(updatedUser);
      
      setMessage({ text: "Profile updated successfully!", type: "success" });
      Swal.fire({
        title: 'Saved!',
        text: 'Your company profile has been updated.',
        icon: 'success',
        confirmButtonColor: '#098b67'
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update profile", type: "error" });
      Swal.fire({
        title: 'Error!',
        text: err.message || "Failed to update profile",
        icon: 'error',
        confirmButtonColor: '#098b67'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = () => {
    if (!newFieldName.trim() || !newFieldValue.trim()) return;
    setCustomFields(prev => ({
      ...prev,
      [newFieldName.trim()]: newFieldValue.trim()
    }));
    setNewFieldName("");
    setNewFieldValue("");
    setAddFieldOpen(false);
  };

  const handleRemoveField = (key: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You are about to remove this custom field.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#098b67',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
      if (result.isConfirmed) {
        setCustomFields(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Settings</h1>
          <p className="text-sm text-slate-500">
            Manage your company profile and business details.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message.text && (
            <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#098b67] text-white hover:bg-[#077053] shadow-sm rounded-lg h-10 px-5"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="pt-2">
        {/* Company Information */}
        <Section 
          title="Company Information" 
          subtitle="Basic details about your company." 
          icon={Building2} 
          colorClass="bg-blue-50/70 text-blue-700"
          defaultOpen={true}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-blue-500" />
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="OMNI ELECTRICS"
                className="bg-white border-slate-200 rounded-lg h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-blue-500" />
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9744037521"
                className="bg-white border-slate-200 rounded-lg h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                GST Number <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <Input
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                placeholder="AEEPP58HHJ552"
                className="bg-white border-slate-200 rounded-lg h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-500" />
                Email <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@omnielectrics.in"
                className="bg-white border-slate-200 rounded-lg h-10"
              />
            </div>
          </div>
        </Section>

        {/* Address Details */}
        <Section 
          title="Address Details" 
          subtitle="Your registered business address." 
          icon={MapPin} 
          colorClass="bg-emerald-50/70 text-emerald-700"
          defaultOpen={true}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              Company Address <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <Input
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Calicut"
              className="bg-white border-slate-200 rounded-lg h-10"
            />
          </div>
        </Section>



        {/* Other Information */}
        <Section 
          title="Other Information" 
          subtitle="Add website, business type and other details." 
          icon={Settings} 
          colorClass="bg-rose-50/70 text-rose-700"
          defaultOpen={false}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Custom Fields</h3>
                <p className="text-xs text-slate-500 mt-1">Add details like PAN, DUNS Number, Registration No, etc.</p>
              </div>
              <Button type="button" onClick={() => setAddFieldOpen(true)} variant="outline" size="sm" className="h-8 rounded-md">
                <Plus className="h-4 w-4 mr-1" /> Add Field
              </Button>
            </div>
            
            {Object.keys(customFields).length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2 bg-slate-50 rounded-lg px-4 border border-slate-100">
                No custom fields added yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(customFields).map(([key, val]) => (
                  <div key={key} className="flex items-end gap-2">
                    <div className="space-y-2 flex-1">
                      <label className="text-xs font-semibold text-slate-700">{key}</label>
                      <Input
                        value={val}
                        onChange={(e) => setCustomFields(prev => ({ ...prev, [key]: e.target.value }))}
                        className="bg-white border-slate-200 rounded-lg h-10"
                      />
                    </div>
                    <Button type="button" variant="ghost" className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0" onClick={() => handleRemoveField(key)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      </div>

      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl font-sans">
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Field Name</label>
              <Input
                placeholder="e.g. PAN Number"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="rounded-lg h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Field Value</label>
              <Input
                placeholder="e.g. ABCDE1234F"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                className="rounded-lg h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFieldOpen(false)} className="rounded-lg h-10">Cancel</Button>
            <Button onClick={handleAddField} disabled={!newFieldName || !newFieldValue} className="bg-[#163848] text-white hover:bg-[#112a36] rounded-lg h-10">
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
