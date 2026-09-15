import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-bold">Terms of Service</h1>
      <p className="mt-4 text-white/70">
        FLIRTY is for adults 18+. You are responsible for the accuracy of your profile. Harassment, scams and illegal
        content are prohibited and may result in suspension. Subscriptions are entitlements enforced server-side. These terms
        are the product contract, not legal advice.
      </p>
    </main>
  );
}
