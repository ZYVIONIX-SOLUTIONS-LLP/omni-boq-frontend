"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/superadmin/Admins");
  }, [router]);
  return null;
}
