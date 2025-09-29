import Sidebar, { type SidebarItem } from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { 
  MdDashboard, 
  MdShoppingCart, 
  MdInventory, 
  MdPeople,
  MdBook    , 
  MdAssessment, 
  MdSettings 
} from "react-icons/md";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const items: SidebarItem[] = [
    {  label: "Dashboard", icon: <MdDashboard />   },
    {   label: "Sales", icon:< MdShoppingCart/> },
    {  label: "Products", icon: <MdInventory /> },
    {  label: "AI Knowledge", icon: <MdBook /> },
    {  label: "Customers", icon: <MdPeople /> },
    {   label: "Reports", icon: <MdAssessment/> },
    {  label: "Settings", icon: <MdSettings /> },
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
