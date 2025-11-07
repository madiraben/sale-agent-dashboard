import Sidebar, { type SidebarItem } from "@/components/sidebar";
import TopbarClient from "@/components/topbar-client";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import React from "react";
import BillingBanner from "@/components/billing-banner";
import { 
  MdDashboard, 
  MdShoppingCart, 
  MdInventory, 
  MdPeople,
  MdAssessment, 
  MdSettings, 
  MdPerson,
} from "react-icons/md";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/auth/login");
  }
  // Query current tenant status (any membership row).
  const { data: tenant } = await supabase
    .from("tenants")
    .select("is_active")
    .limit(1)
    .single();
  
  // ============================================================
  // DEVELOPMENT MODE: Billing/Payment is disabled
  // Set isActive to true to bypass payment requirements
  // TO RE-ENABLE PAYMENTS: Change this line back to: (tenant as any)?.is_active ?? false
  // ============================================================
  const isActive = true; // Development: bypass billing checks
  // const isActive = (tenant as any)?.is_active ?? false; // Production: enable this line
  const items: SidebarItem[] = [
    {  href: "/dashboard", label: "Dashboard", icon: <MdDashboard />   },
    {  href: "/dashboard/sales", label: "Sales", icon:< MdShoppingCart/> },
    {  href: "/dashboard/products", label: "Products", icon: <MdInventory />, children: [
      { href: "/dashboard/products/products", label: "Products" },
      { href: "/dashboard/products/categories", label: "Product Categories" },
    ] },
    {  href: "/dashboard/customers", label: "Customers", icon: <MdPeople /> },
    {  href: "/dashboard/play-ground", label: "Playground", icon: <MdAssessment/> },
    {  href: "/dashboard/profile", label: "Profile", icon: <MdPerson /> },
    {  href: "/dashboard/setting", label: "Settings", icon: <MdSettings /> },
  ];

  return (
    <div className="flex min-h-dvh">
      <Sidebar items={items} />
      <div className="flex min-h-dvh flex-1 flex-col bg-[#EEF2F7]">
        <TopbarClient title="SYSTEM MANAGER" />
        <main className="flex-1 p-4 md:p-6">
          <BillingBanner isActive={isActive} />
          {children}
        </main>
      </div>
    </div>
  );
}

// Billing gate is implemented as a client component in components/billing-gate.tsx
