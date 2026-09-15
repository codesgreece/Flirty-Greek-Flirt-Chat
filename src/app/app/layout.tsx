import { redirect } from "next/navigation";
import { readSession } from "@/server/auth/session";
import { AppShell } from "@/components/navigation/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/auth?mode=login");
  if (!session.user.profile?.onboardingCompletedAt) redirect("/onboarding");
  return <AppShell>{children}</AppShell>;
}
