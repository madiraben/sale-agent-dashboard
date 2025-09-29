import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("session");
  redirect(hasSession ? "/dashboard" : "/login");
}
