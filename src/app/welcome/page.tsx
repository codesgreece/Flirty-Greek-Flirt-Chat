"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FlirtyLogo } from "@/components/brand/FlirtyLogo";
import { FlirtyButton } from "@/components/ui/FlirtyButton";

export default function WelcomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-between px-6 py-10">
      <div />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="text-center"
      >
        <FlirtyLogo className="mx-auto h-24 w-24" />
        <h1 className="mt-6 text-4xl font-extrabold">
          FLIRT<span className="text-flirty-pink">Y</span>
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.28em] text-white/50">Meet • Flirt • Belong</p>
        <p className="mt-6 max-w-xs text-white/70">Meet someone worth staying for.</p>
      </motion.div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href="/auth?mode=register">
          <FlirtyButton className="w-full">Create account</FlirtyButton>
        </Link>
        <Link href="/auth?mode=login">
          <FlirtyButton variant="ghost" className="w-full">
            Log in
          </FlirtyButton>
        </Link>
      </div>
    </main>
  );
}
