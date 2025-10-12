import Sidebar, { type SidebarItem } from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { 
  MdDashboard, 
  MdShoppingCart, 
  MdInventory, 
  MdPeople,
  MdBook    , 
  MdAssessment, 
  MdSettings 
} from "react-icons/md";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }
  const items: SidebarItem[] = [
    {  href: "/dashboard", label: "Dashboard", icon: <MdDashboard />   },
    {  href: "/dashboard/sales", label: "Sales", icon:< MdShoppingCart/> },
    {  href: "/dashboard/products", label: "Products", icon: <MdInventory />, children: [
      { href: "/dashboard/products/products", label: "Products" },
      { href: "/dashboard/products/categories", label: "Product Categories" },
    ] },
    {  href: "/dashboard/add-ai-knowleadge", label: "AI Knowledge", icon: <MdBook /> },
    {  href: "/dashboard/customers", label: "Customers", icon: <MdPeople /> },
    {  href: "/dashboard/play-ground", label: "Playground", icon: <MdAssessment/> },
    {  href: "/dashboard/setting", label: "Settings", icon: <MdSettings /> },
  ];

  return (
    <div className="flex min-h-dvh">
      <Sidebar items={items} />
      <div className="flex min-h-dvh flex-1 flex-col bg-[#EEF2F7]">
        <Topbar title="SYSTEM MANAGER" />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
