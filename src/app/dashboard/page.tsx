import { FaBoxOpen, FaTags, FaUsers, FaShoppingCart, FaCalendarAlt, FaClock, FaBars, FaChartLine, FaEllipsisH, FaUserCircle } from "react-icons/fa";
import Card from "@/components/ui/card";
import IconButton from "@/components/ui/icon-button";
import Section from "@/components/dashboard/section";
import StatCard from "@/components/dashboard/stat-card";
import TopItem from "@/components/dashboard/top-item";
import { GaugePlaceholder, BarPlaceholder } from "@/components/dashboard/placeholders";

export default function Page() {
  // Icon mapping for summary cards
  const summaryIcons = [
    <FaBoxOpen className="text-blue-500" size={22} />,
    <FaTags className="text-emerald-500" size={22} />,
    <FaUsers className="text-gray-500" size={22} />,
    <FaShoppingCart className="text-cyan-500" size={22} />,
  ];

  // Icon mapping for top performer actions
  const performerActions = [
    <FaCalendarAlt />,
    <FaClock />,
    <FaBars />,
    <FaChartLine />,
    <FaEllipsisH />,
  ];

  return (
    <div className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">Summary</h3>
          <div className="grid grid-cols-2 gap-4 md:gap-5">
            {[
              { label: "Products", value: "18", iconBg: "bg-blue-100", dot: true },
              { label: "Categories", value: "3", iconBg: "bg-emerald-100" },
              { label: "Customers", value: "3", iconBg: "bg-gray-100" },
              { label: "Sales", value: "100", iconBg: "bg-cyan-100" },
            ].map((c, i) => (
              <StatCard key={i} icon={<span className={`grid h-10 w-10 place-items-center rounded-full ${c.iconBg}`}>{summaryIcons[i]}</span>} value={c.value} label={c.label} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            <span className="h-2 w-2 rounded-full bg-[#1E8BF7]" />
          </div>
        </Card>

        <Section
          title="Top Products"
        >
          <div className="space-y-3">
            {["Coca Cola 330ml", "Heineken 330ml", "Beef Steak 250g"].map((name, i) => (
              <TopItem key={i} avatar={<FaBoxOpen size={20} />} title={name} subtitle="Most sold" amount="4,337,000 KHR" />
            ))}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Product Categories" actions={<IconButton round={false} aria-label="date"><FaCalendarAlt /></IconButton>}>
          <GaugePlaceholder />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-700">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-lime-600" /> Food-Meat (1)</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-lime-400" /> Alcohol (5)</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-lime-300" /> Beverage (12)</span>
          </div>
        </Section>

        <Section title="Sales Activity" actions={<IconButton round={false} aria-label="date"><FaCalendarAlt /></IconButton>}>
          <BarPlaceholder />
          <div className="mt-2 grid grid-cols-8 text-center text-xs text-gray-600">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Oct", "Nov"].map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

