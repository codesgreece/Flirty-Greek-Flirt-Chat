import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Safety",
  description: "How FLIRTY keeps people safe while they meet, flirt and belong.",
};

export default function SafetyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-bold">Safety is a product feature</h1>
      <p className="mt-4 text-white/70">
        Block, report, unmatch, hide and restrict are first-class. Reports go to FLIRTY moderation with categories for fake
        profiles, harassment, spam, scam, inappropriate content and threats. Verification badges only come from server state.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-white/70">
        <li>Never share payment details or off-platform payment requests.</li>
        <li>Meet in public if you choose to meet.</li>
        <li>FLIRTY never exposes your exact coordinates.</li>
      </ul>
      <Link href="/" className="mt-8 inline-block text-flirty-pink">Back to FLIRTY</Link>
    </main>
  );
}
