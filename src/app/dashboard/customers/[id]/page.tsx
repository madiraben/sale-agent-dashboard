"use client"
import { notFound } from "next/navigation";
import { customers, orders, currency } from "@/data/mock";
import Button from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function CustomerHistory({ params }: { params: { id: string } }) {
  const customer = customers.find((c) => c.id === params.id);
  if (!customer) return notFound();

  const history = orders.filter((o) => o.customerId === customer.id);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{customer.name}</h2>
          <p className="text-sm text-gray-600">
            {customer.phone} {customer.email ? `• ${customer.email}` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/customers")}>
          Back to customers
        </Button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Order history</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{o.id}</td>
                  <td className="px-3 py-2">{o.date}</td>
                  <td className="px-3 py-2">{currency(o.total)}</td>
                  <td className="px-3 py-2 capitalize">{o.status}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    No orders yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


