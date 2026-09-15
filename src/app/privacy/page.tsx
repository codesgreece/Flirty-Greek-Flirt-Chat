import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 prose-invert">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-white/70">
        FLIRTY stores your account, profile, interactions and messages on first-party infrastructure (PostgreSQL, Redis,
        self-hosted files). We do not sell your personal data. You may export or delete your account from Settings. Deletion
        anonymizes personal fields, removes photos and sessions, and replaces remaining message bodies. Limited safety and
        billing records may be retained where legally required, without identifiers.
      </p>
    </main>
  );
}
