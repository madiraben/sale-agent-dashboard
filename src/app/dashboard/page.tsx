import { FaBoxOpen, FaTags, FaUsers, FaShoppingCart, FaCalendarAlt, FaClock, FaBars, FaChartLine, FaEllipsisH } from "react-icons/fa";
import Card from "@/components/ui/card";
import IconButton from "@/components/ui/icon-button";
import Section from "@/components/dashboard/section";
import StatCard from "@/components/dashboard/stat-card";
import TopItem from "@/components/dashboard/top-item";
import { GaugePlaceholder } from "@/components/dashboard/placeholders";
import SalesKPI from "@/components/dashboard/SalesKPI";
import { Currency } from "@/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createSupabaseServerClient();

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const monthStartStr = firstOfMonth.toISOString().slice(0, 10);

  const [pRes, cRes, custRes, oRes, topRes, dailyTodayRes, weeklyTop2Res, monthlyThisRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("product_categories").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("top_products_sales")
      .select("id,name,total_qty,total_amount")
      .order("total_amount", { ascending: false })
      .limit(3),
    supabase.from("sales_totals_daily").select("day,total").eq("day", todayStr),
    supabase.from("sales_totals_weekly").select("iso_week,week_start,total").order("week_start", { ascending: false }).limit(2),
    supabase.from("sales_totals_monthly").select("ym,month_start,total").eq("month_start", monthStartStr),
  ]);

  const productsCount = pRes.count ?? 0;
  const categoriesCount = cRes.count ?? 0;
  const customersCount = custRes.count ?? 0;
  const ordersCount = oRes.count ?? 0;
  const top = (topRes.data as any) ?? [];
  const todayRow = ((dailyTodayRes.data as any) ?? [])[0];
  const weeklyTop2 = (weeklyTop2Res.data as any) ?? [];
  const monthRow = ((monthlyThisRes.data as any) ?? [])[0];
  const todayTotal = Number(todayRow?.total ?? 0);
  const thisWeekTotal = Number(weeklyTop2[0]?.total ?? 0);
  const lastWeekTotal = Number(weeklyTop2[1]?.total ?? 0);
  const thisMonthTotal = Number(monthRow?.total ?? 0);

  const summaryIcons = [
    <FaBoxOpen className="text-cyan-600" size={22} />,
    <FaTags className="text-purple-600" size={22} />,
    <FaUsers className="text-teal-600" size={22} />,
    <FaShoppingCart className="text-purple-500" size={22} />,
  ];

  return (
    <div className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">Summary</h3>
          <div className="grid grid-cols-2 gap-4 md:gap-5">
            {[
              { label: "Products", value: productsCount, iconBg: "bg-cyan-50" },
              { label: "Categories", value: categoriesCount, iconBg: "bg-purple-50" },
              { label: "Customers", value: customersCount, iconBg: "bg-teal-50" },
              { label: "Sales", value: ordersCount, iconBg: "bg-purple-50" },
            ].map((c, i) => (
              <StatCard key={i} icon={<span className={`grid h-10 w-10 place-items-center rounded-full ${c.iconBg}`}>{summaryIcons[i]}</span>} value={c.value} label={c.label} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
          </div>
        </Card>

        <Section
          title="Top Products"
        >
          <div className="space-y-3">
            {top.map((t: any, i: number) => (
              <TopItem key={t.id} avatar={<FaBoxOpen size={20} />} title={t.name} subtitle={`${t.total_qty} sold`} amount={Currency(Number(t.total_amount))} />
            ))}
            {top.length === 0 ? (
              <div className="text-sm text-gray-600">No sales yet</div>
            ) : null}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Product Categories" actions={<IconButton round={false} aria-label="date"><FaCalendarAlt /></IconButton>}>
          <GaugePlaceholder />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-700">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Food-Meat (1)</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-purple-400" /> Alcohol (5)</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-teal-400" /> Beverage (12)</span>
          </div>
        </Section>

        <Section title="Sales Activity" actions={<IconButton round={false} aria-label="date"><FaCalendarAlt /></IconButton>}>
          <SalesKPI />
        </Section>
      </div>
    </div>
  );
}

