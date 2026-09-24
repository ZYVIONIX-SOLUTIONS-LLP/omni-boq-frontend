"use client";

import { useEffect, useState } from "react";
import { getUser, AuthUser, saveAuth, getAccessToken, getRefreshToken } from "@/app/lib/auth-storage";
import { updateProfile } from "@/app/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Phone, FileText, MapPin, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [gst, setGst] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const currentUser = getUser();
    if (currentUser) {
      setUser(currentUser);
      setCompanyName(currentUser.companyName || "");
      setPhone(currentUser.phone || "");
      setGst(currentUser.gst || "");
      setCompanyAddress(currentUser.companyAddress || "");
    }
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      // Call backend to update
      await updateProfile({
        companyName,
        phone,
        gst,
        companyAddress,
      });

      // Update local storage session
      const updatedUser: AuthUser = {
        ...user,
        companyName,
        phone,
        gst,
        companyAddress,
      };
      
      const access = getAccessToken();
      const refresh = getRefreshToken();
      if (access && refresh) {
        saveAuth(updatedUser, access, refresh);
      }
      setUser(updatedUser);

      setMessage({ text: "Profile updated successfully!", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update profile", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 p-8 bg-zinc-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Settings</h1>
        <p className="text-zinc-500 mb-8">Manage your company profile and business details.</p>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 md:p-8 space-y-6">
          
          <div>
            <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              Company Name
            </label>
            <Input 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Zyvionix Solutions"
              className="h-12 bg-zinc-50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-zinc-400" />
              Mobile Number
            </label>
            <Input 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter mobile number"
              className="h-12 bg-zinc-50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              GST Number (Optional)
            </label>
            <Input 
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              placeholder="Enter GST number"
              className="h-12 bg-zinc-50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-zinc-400" />
              Company Address (Optional)
            </label>
            <Input 
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Enter full address"
              className="h-12 bg-zinc-50"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-zinc-100">
            <div>
              {message.text && (
                <p className={`text-sm font-medium ${message.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                  {message.text}
                </p>
              )}
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8 rounded-lg shadow-sm font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
