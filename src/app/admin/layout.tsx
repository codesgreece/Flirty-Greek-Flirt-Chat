import { redirect } from "next/navigation";
import { readSession } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/auth?mode=login");
  if (!session.user.adminProfile && session.user.role !== "ADMIN") redirect("/app/discover");
  return children;
}
