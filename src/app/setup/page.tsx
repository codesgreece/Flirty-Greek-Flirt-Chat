"use client";

import Link from "next/link";
import { FlirtyWordmark } from "@/components/brand/FlirtyLogo";

export default function SetupPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 py-12">
      <FlirtyWordmark />
      <h1 className="mt-10 text-3xl font-bold">Μόνιμη βάση Postgres</h1>
      <p className="mt-3 text-white/70">
        Το login χρειάζεται Postgres που ανήκει στο δικό σου Vercel project. Όχι βάση 24 ή 72 ωρών —
        μία φορά την φτιάχνεις και μένει.
      </p>
      <ol className="mt-8 list-decimal space-y-4 pl-5 text-white/80">
        <li>
          Άνοιξε το project{" "}
          <a className="text-flirty-pink underline" href="https://vercel.com/codesgreeces-projects/flirty/stores">
            Vercel → Storage
          </a>
          .
        </li>
        <li>
          <strong>Create Database</strong> → <strong>Neon</strong> (ή Postgres). Σύνδεσέ το σε{" "}
          <strong>Production</strong>.
        </li>
        <li>
          Το Vercel βάζει μόνο του <code className="text-flirty-pink">POSTGRES_URL</code>. Προαιρετικά πρόσθεσε
          στα Environment Variables:
          <ul className="mt-2 list-disc pl-5 text-sm">
            <li>
              <code>SESSION_SECRET</code> — τουλάχιστον 32 τυχαίους χαρακτήρες
            </li>
            <li>
              <code>APP_URL</code> — <code>https://flirty-ten.vercel.app</code>
            </li>
          </ul>
        </li>
        <li>
          Deployments → Production → <strong>Redeploy</strong>. Τρέχουν τα migrations και το seed:{" "}
          <code>admin@flirty.local</code> / <code>FlirtyAdmin!234</code>.
        </li>
      </ol>
      <p className="mt-8 text-sm text-white/50">
        Αν έχεις ήδη Neon, βάλε το connection string ως <code>DATABASE_URL</code> στο Production. Μην
        χρησιμοποιείς claimable/demo βάσεις — λήγουν.
      </p>
      <Link href="/auth?mode=login" className="mt-10 inline-flex text-flirty-pink">
        Πίσω στο login
      </Link>
    </main>
  );
}
