import { BotSession, CartItem } from "../session";
import { Product } from "../product-search";

export type StageResponse = {
  reply: string;
  newStage: BotSession["stage"];
  updatedCart?: CartItem[];
  updatedPendingProducts?: Array<{ query: string; results: Product[] }>;
  updatedContact?: { name?: string; email?: string; phone?: string; address?: string };
  orderId?: string;
};



