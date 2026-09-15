import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readSession } from "@/server/auth/session";
import { LandingPage } from "@/features/landing/LandingPage";

function isMobile(ua: string) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export default async function HomePage() {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  const headerList = await headers();
  const ua = headerList.get("user-agent") ?? "";
  const fetchDest = headerList.get("sec-fetch-dest") ?? "";
  const isEmbeddedPreview = fetchDest === "iframe" || fetchDest === "embed";
  if (session) {
    if (!session.user.profile?.onboardingCompletedAt) redirect("/onboarding");
    redirect("/app/discover");
  }
  if (isMobile(ua) && !isEmbeddedPreview) redirect("/welcome");
  return <LandingPage />;
}
