export type Customer = { id: string; name: string; phone: string; email?: string };
export type Order = {
  id: string;
  customerId: string;
  date: string;
  total: number;
  status: "paid" | "refunded" | "pending";
  items?: Array<{ productId: string; qty: number; price: number }>;
};
export type Product = { id: string; name: string; sku: string; price: number; stock: number; category?: string; image?: string; description?: string };

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
  { id: "o106", customerId: "c1", date: "2025-09-30", total: 6.22, status: "pending", items: [
    { productId: "p1", qty: 3, price: 0.99 },
    { productId: "p3", qty: 1, price: 3.25 },
  ] },
];

export const products: Product[] = [
  { id: "p1", name: "Coca-Cola 330ml", sku: "CC-330", price: 0.99, stock: 120, category: "Beverage", image: "/images/apps/loginImage.png", description: "Classic soda beverage, 330ml can." },
  { id: "p2", name: "Orange Juice 1L", sku: "OJ-1L", price: 2.5, stock: 42, category: "Beverage", description: "100% orange juice, 1 liter carton." },
  { id: "p3", name: "Beef Jerky 50g", sku: "BJ-50", price: 3.25, stock: 18, category: "Food-Meat", description: "Smoked beef jerky, 50g snack pack." },
  { id: "p4", name: "Red Wine 750ml", sku: "RW-750", price: 14.99, stock: 8, category: "Alcohol", description: "Dry red wine, 750ml bottle." },
];

export const currency = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });


