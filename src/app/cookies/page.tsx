import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-bold">Cookie Policy</h1>
      <p className="mt-4 text-white/70">
        Essential cookies keep you signed in (HTTP-only session) and protect mutations (CSRF). Optional analytics/marketing
        cookies stay off until you enable them in privacy settings.
      </p>
    </main>
  );
}
