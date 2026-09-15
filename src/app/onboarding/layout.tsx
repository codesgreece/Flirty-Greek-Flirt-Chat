import { redirect } from "next/navigation";
import { readSession } from "@/server/auth/session";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/auth?mode=register");
  if (session.user.profile?.onboardingCompletedAt) redirect("/app/discover");
  return children;
}
