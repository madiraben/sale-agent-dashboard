export type Customer = { id: string; name: string; phone: string; email?: string };
export type Order = { id: string; customerId: string; date: string; total: number; status: "paid" | "refunded" | "pending" };

export const customers: Customer[] = [
  { id: "c1", name: "Heng Tongsour", phone: "088-111-222", email: "heng@example.com" },
  { id: "c2", name: "Eng Sokchheng", phone: "088-333-444", email: "eng@example.com" },
  { id: "c3", name: "Chan Sopheap", phone: "088-555-666" },
];

export const orders: Order[] = [
  { id: "o101", customerId: "c1", date: "2025-09-01", total: 120.5, status: "paid" },
  { id: "o102", customerId: "c1", date: "2025-09-10", total: 59.9, status: "paid" },
  { id: "o103", customerId: "c2", date: "2025-09-03", total: 210.0, status: "pending" },
  { id: "o104", customerId: "c2", date: "2025-09-07", total: 35.0, status: "refunded" },
  { id: "o105", customerId: "c3", date: "2025-09-05", total: 18.25, status: "paid" },
];

export const currency = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });


