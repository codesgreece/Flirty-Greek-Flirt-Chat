"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";

const STEPS = [
  "Name",
  "Birthday",
  "Gender",
  "Who to meet",
  "Location",
  "Intention",
  "Interests",
  "Vibe",
  "Photos",
  "Bio",
  "Prompts",
  "Verification",
  "Compatibility",
  "Preferences",
];

const INTERESTS = ["music", "film", "food", "travel", "fitness", "art", "books", "nightlife", "outdoors", "tech", "wine", "dogs", "cats", "yoga", "sea"];
const VIBES = ["CHILL", "ROMANTIC", "ADVENTUROUS", "FUNNY", "SOCIAL", "DEEP", "CREATIVE", "AMBITIOUS", "SPONTANEOUS"];

export default function OnboardingPage() {
  const router = useRouter();
  const { me, refresh, toast } = useApp();
  const [step, setStep] = useState(me?.onboardingStep ?? 0);
  const [form, setForm] = useState({
    displayName: me?.profile?.name ?? "",
    dateOfBirth: "",
    gender: "WOMAN",
    seeking: ["MAN"] as string[],
    city: "Athens",
    country: "Greece",
    latitude: 37.9838,
    longitude: 23.7275,
    datingIntention: "RELATIONSHIP",
    interests: ["music", "travel"] as string[],
    vibes: ["ROMANTIC", "CHILL"] as string[],
    bio: "",
    prompts: [{ question: "The perfect Sunday", answer: "" }],
    minAge: 23,
    maxAge: 38,
    maxDistanceKm: 40,
    answers: { communication: "thoughtful", activity: "evenings-out" },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (me?.onboardingComplete) router.replace("/app/discover");
  }, [me, router]);

  async function next() {
    setSaving(true);
    try {
      await api("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({ ...form, step: Math.min(step + 1, STEPS.length - 1) }),
      });
      if (step >= STEPS.length - 1) {
        await refresh();
        toast("You're in. Go find a Vibe.");
        router.push("/app/discover");
        return;
      }
      setStep((s) => s + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-8">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">Onboarding</p>
      <div className="mt-4 flex gap-1">
        {STEPS.map((_, i) => (
          <motion.span
            key={i}
            className="h-1.5 flex-1 rounded-full bg-white/10"
            animate={{ backgroundColor: i <= step ? "#ff3d8a" : "rgba(255,255,255,0.12)" }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          className="mt-8"
        >
          <h1 className="text-3xl font-bold">{STEPS[step]}</h1>
          {step === 0 && (
            <input className="mt-6 w-full rounded-2xl bg-white/5 p-4" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your first name" />
          )}
          {step === 1 && (
            <div className="mt-6">
              <p className="text-sm text-white/60">You must be 18. We check this on the server.</p>
              <input type="date" className="mt-3 w-full rounded-2xl bg-white/5 p-4" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
          )}
          {step === 2 && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["WOMAN", "MAN", "NONBINARY", "OTHER"].map((g) => (
                <button key={g} type="button" onClick={() => setForm({ ...form, gender: g })} className={`rounded-2xl p-4 ${form.gender === g ? "bg-flirty-pink" : "bg-white/5"}`}>
                  {g.toLowerCase()}
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["WOMAN", "MAN", "NONBINARY", "OTHER"].map((g) => {
                const on = form.seeking.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        seeking: on ? form.seeking.filter((x) => x !== g) : [...form.seeking, g],
                      })
                    }
                    className={`rounded-2xl p-4 ${on ? "bg-indigo-500" : "bg-white/5"}`}
                  >
                    {g.toLowerCase()}
                  </button>
                );
              })}
            </div>
          )}
          {step === 4 && (
            <div className="mt-6 space-y-3">
              <input className="w-full rounded-2xl bg-white/5 p-4" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
              <input className="w-full rounded-2xl bg-white/5 p-4" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" />
              <p className="text-xs text-white/50">Precise coordinates stay private. Others only see a fuzzy distance.</p>
            </div>
          )}
          {step === 5 && (
            <div className="mt-6 grid gap-3">
              {["CASUAL", "DATING", "RELATIONSHIP", "MARRIAGE", "FIGURING_IT_OUT"].map((d) => (
                <button key={d} type="button" onClick={() => setForm({ ...form, datingIntention: d })} className={`rounded-2xl p-4 text-left ${form.datingIntention === d ? "bg-flirty-pink" : "bg-white/5"}`}>
                  {d.replaceAll("_", " ").toLowerCase()}
                </button>
              ))}
            </div>
          )}
          {step === 6 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {INTERESTS.map((slug) => {
                const on = form.interests.includes(slug);
                return (
                  <button key={slug} type="button" onClick={() => setForm({ ...form, interests: on ? form.interests.filter((x) => x !== slug) : [...form.interests, slug] })} className={`rounded-full px-4 py-2 ${on ? "bg-flirty-pink" : "bg-white/5"}`}>
                    {slug}
                  </button>
                );
              })}
            </div>
          )}
          {step === 7 && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {VIBES.map((v) => {
                const on = form.vibes.includes(v);
                return (
                  <button key={v} type="button" onClick={() => setForm({ ...form, vibes: on ? form.vibes.filter((x) => x !== v) : [...form.vibes, v] })} className={`rounded-2xl p-4 ${on ? "bg-indigo-500" : "bg-white/5"}`}>
                    {v.toLowerCase()}
                  </button>
                );
              })}
            </div>
          )}
          {step === 8 && (
            <p className="mt-6 text-white/70">You can add photos from your profile after this. A seed gallery is used until you upload.</p>
          )}
          {step === 9 && (
            <textarea className="mt-6 min-h-36 w-full rounded-2xl bg-white/5 p-4" maxLength={400} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A little about you" />
          )}
          {step === 10 && (
            <input className="mt-6 w-full rounded-2xl bg-white/5 p-4" value={form.prompts[0]?.answer ?? ""} onChange={(e) => setForm({ ...form, prompts: [{ question: "The perfect Sunday", answer: e.target.value }] })} placeholder="The perfect Sunday is…" />
          )}
          {step === 11 && (
            <div className="mt-6 space-y-3">
              <p className="text-white/70">Verification is reviewed by FLIRTY. You can start now or later.</p>
              <FlirtyButton type="button" variant="ghost" onClick={() => api("/api/settings?type=verify", { method: "POST", body: "{}" })}>
                Submit for verification
              </FlirtyButton>
            </div>
          )}
          {step === 12 && (
            <div className="mt-6 space-y-3">
              <p>How do you like to communicate?</p>
              {["thoughtful", "playful", "direct"].map((c) => (
                <button key={c} type="button" className={`w-full rounded-2xl p-4 ${form.answers.communication === c ? "bg-flirty-pink" : "bg-white/5"}`} onClick={() => setForm({ ...form, answers: { ...form.answers, communication: c } })}>
                  {c}
                </button>
              ))}
            </div>
          )}
          {step === 13 && (
            <div className="mt-6 space-y-4">
              <label className="block text-sm">Ages {form.minAge}–{form.maxAge}
                <input type="range" min={18} max={70} value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: Number(e.target.value) })} className="w-full" />
              </label>
              <label className="block text-sm">Distance {form.maxDistanceKm} km
                <input type="range" min={5} max={200} value={form.maxDistanceKm} onChange={(e) => setForm({ ...form, maxDistanceKm: Number(e.target.value) })} className="w-full" />
              </label>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
      <div className="mt-10 flex gap-3">
        {step > 0 && (
          <FlirtyButton variant="ghost" type="button" onClick={() => setStep((s) => s - 1)}>
            Back
          </FlirtyButton>
        )}
        <FlirtyButton className="flex-1" loading={saving} disabled={saving} onClick={next} type="button">
          {step === STEPS.length - 1 ? "Enter FLIRTY" : "Continue"}
        </FlirtyButton>
      </div>
    </main>
  );
}
