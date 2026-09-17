"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { DEALBREAKERS, LIFESTYLE_CHIPS, AVAILABILITY } from "@/lib/lifestyle";
import { dailyVibeFor } from "@/lib/daily-vibe";

const VIBES = ["CHILL", "ROMANTIC", "ADVENTUROUS", "FUNNY", "SOCIAL", "DEEP", "CREATIVE", "AMBITIOUS", "SPONTANEOUS"] as const;
const INTENTIONS = ["CASUAL", "DATING", "RELATIONSHIP", "MARRIAGE", "FIGURING_IT_OUT"] as const;
const GENDERS = ["WOMAN", "MAN", "NONBINARY", "OTHER"] as const;
const LIFESTYLE_FIELDS = [
  ["pace", "Lifestyle pace"],
  ["family", "Family plans"],
  ["zodiac", "Zodiac"],
] as const;
const EXTRA_VIBES = ["Night Owl", "Coffee Lover", "Gym", "Travel", "Introvert", "Extrovert"] as const;

type Catalog = { interests: { slug: string; label: string }[]; vibes: { code: string; label: string }[] };
type Photo = { id: string; src?: string; mediumKey?: string; thumbKey?: string; isPrimary?: boolean };

export default function EditProfilePage() {
  const { me, refresh, toast } = useApp();
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog>({ interests: [], vibes: [] });
  const [displayName, setDisplayName] = useState(me?.profile?.name ?? "");
  const [bio, setBio] = useState(me?.profile?.bio ?? "");
  const [city, setCity] = useState(me?.profile?.city ?? "");
  const [jobTitle, setJobTitle] = useState(me?.profile?.jobTitle ?? "");
  const [education, setEducation] = useState(me?.profile?.education ?? "");
  const [intention, setIntention] = useState(me?.profile?.intention ?? "DATING");
  const [gender, setGender] = useState(me?.profile?.gender ?? "OTHER");
  const [seeking, setSeeking] = useState<string[]>(me?.profile?.seeking ?? []);
  const [languages, setLanguages] = useState((me?.profile?.languages ?? []).join(", "));
  const [interests, setInterests] = useState<string[]>(me?.profile?.interestSlugs ?? []);
  const [vibes, setVibes] = useState<string[]>(me?.profile?.vibeCodes ?? []);
  const [minAge, setMinAge] = useState(me?.preference?.minAge ?? 21);
  const [maxAge, setMaxAge] = useState(me?.preference?.maxAge ?? 40);
  const [distance, setDistance] = useState(me?.preference?.maxDistanceKm ?? 50);
  const [lookingFor, setLookingFor] = useState<string[]>(me?.preference?.intentions ?? [me?.profile?.intention ?? "DATING"]);
  const [photos, setPhotos] = useState<Photo[]>(me?.profile?.photos ?? []);
  const [lifestyle, setLifestyle] = useState<Record<string, string>>(me?.profile?.lifestyle ?? {});
  const [dragId, setDragId] = useState<string | null>(null);
  const [bioEn, setBioEn] = useState(me?.profile?.bioEn ?? "");
  const [heightCm, setHeightCm] = useState(me?.profile?.heightCm ? String(me?.profile?.heightCm) : "");
  const [availability, setAvailability] = useState(me?.profile?.availability ?? "");
  const [dealbreakers, setDealbreakers] = useState<string[]>(me?.preference?.dealbreakers ?? []);
  const [smartOrder, setSmartOrder] = useState(me?.profile?.smartPhotoOrder ?? true);
  const [slowDiscover, setSlowDiscover] = useState(me?.profile?.slowDiscover ?? false);
  const [dailyAnswer, setDailyAnswer] = useState(me?.profile?.dailyVibeAnswer ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Catalog>("/api/onboarding").then(setCatalog).catch(() => undefined);
  }, []);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      await api("/api/profiles", {
        method: "PATCH",
        body: JSON.stringify({
          displayName,
          bio,
          bioEn,
          city,
          jobTitle,
          education,
          datingIntention: intention,
          gender,
          seeking,
          languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
          interests,
          vibes,
          minAge,
          maxAge,
          maxDistanceKm: distance,
          lifestyle,
          intentions: lookingFor,
          heightCm: heightCm ? Number(heightCm) : null,
          availability,
          dealbreakers,
          smartPhotoOrder: smartOrder,
          slowDiscover,
          dailyVibeAnswer: dailyAnswer,
        }),
      });
      await refresh();
      toast("Profile saved");
      router.push("/app/profile");
    } catch {
      toast("Couldn't save. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    const form = new FormData();
    form.set("file", file);
    const photo = await api<Photo>("/api/profiles?type=photo", { method: "POST", body: form });
    setPhotos((list) => [...list, { ...photo, src: photo.src ?? `/api/media/${photo.mediumKey}` }]);
    await refresh();
  }

  async function removePhoto(id: string) {
    await api("/api/profiles?type=delete-photo", { method: "POST", body: JSON.stringify({ photoId: id }) });
    const next = photos.filter((p) => p.id !== id);
    setPhotos(next);
    await refresh();
  }

  async function persistOrder(next: Photo[], primaryId?: string) {
    setPhotos(next);
    await api("/api/profiles?type=reorder", {
      method: "POST",
      body: JSON.stringify({ photoIds: next.map((p) => p.id), primaryId: primaryId ?? next[0]?.id }),
    });
    await refresh();
  }

  async function makePrimary(id: string) {
    const chosen = photos.find((p) => p.id === id);
    if (!chosen) return;
    const next = [chosen, ...photos.filter((p) => p.id !== id)];
    await persistOrder(next, id);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = photos.findIndex((p) => p.id === dragId);
    const to = photos.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    void persistOrder(next);
    setDragId(null);
  }

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function extraVibes() {
    return (lifestyle.extras ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  }

  function toggleExtra(label: string) {
    const current = extraVibes();
    const next = current.includes(label) ? current.filter((v) => v !== label) : [...current, label];
    setLifestyle({ ...lifestyle, extras: next.join(",") });
  }

  return (
    <form className="mx-auto max-w-lg space-y-8 px-4 py-4 pb-28" onSubmit={save}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="text-sm text-white/60">
          ← Back
        </button>
        <h1 className="text-xl font-bold">Edit Profile</h1>
        <span />
      </div>

      <section>
        <h2 className="font-semibold">Φωτογραφίες</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => setDragId(photo.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(photo.id)}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src ?? `/api/media/${photo.mediumKey}`} alt="" className="h-full w-full object-cover" />
              {index === 0 ? (
                <span className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px]">MAIN PHOTO</span>
              ) : (
                <button type="button" className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px]" onClick={() => makePrimary(photo.id)}>
                  Set main
                </button>
              )}
              <button type="button" className="absolute right-1 top-1 rounded-full bg-black/70 px-2 text-xs" onClick={() => removePhoto(photo.id)}>
                ×
              </button>
            </div>
          ))}
          {photos.length < 6
            ? Array.from({ length: Math.min(3, 6 - photos.length) }).map((_, i) => (
                <label key={`add-${i}`} className="grid aspect-[3/4] place-items-center rounded-2xl border border-dashed border-white/20 text-2xl text-white/40">
                  +
                  <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
              ))
            : null}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Βιογραφικό</h2>
        <textarea value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} className="mt-2 h-32 w-full rounded-2xl bg-white/5 px-4 py-3" />
        <p className="mt-1 text-right text-xs text-white/40">{bio.length} / 500</p>
        <label className="mt-3 block text-sm">English bio
          <textarea value={bioEn} maxLength={500} onChange={(e) => setBioEn(e.target.value)} className="mt-2 h-24 w-full rounded-2xl bg-white/5 px-4 py-3" />
        </label>
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold">Basic information</h2>
        <label className="text-sm">
          Όνομα
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3" />
        </label>
        <p className="text-sm text-white/50">Age · {me?.profile?.age} (locked for safety)</p>
        <label className="text-sm">
          Gender
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3">
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Dating intention
          <select value={intention} onChange={(e) => setIntention(e.target.value)} className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3">
            {INTENTIONS.map((g) => (
              <option key={g} value={g}>{g.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Location
          <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3" />
        </label>
        <label className="text-sm">
          Job
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3" />
        </label>
        <label className="text-sm">
          Education
          <input value={education} onChange={(e) => setEducation(e.target.value)} className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3" />
        </label>
        <label className="text-sm">
          Languages
          <input value={languages} onChange={(e) => setLanguages(e.target.value)} className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3" placeholder="Greek, English" />
        </label>
      </section>

      <section>
        <h2 className="font-semibold">Ενδιαφέροντα</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {catalog.interests.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => toggle(interests, item.slug, setInterests)}
              className={`rounded-full px-3 py-1 text-sm ${interests.includes(item.slug) ? "bg-flirty-pink" : "bg-white/10"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Το Vibe μου</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(catalog.vibes.length ? catalog.vibes : VIBES.map((code) => ({ code, label: code }))).map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => toggle(vibes, item.code, setVibes)}
              className={`rounded-full px-3 py-1 text-sm ${vibes.includes(item.code) ? "bg-indigo-500" : "bg-white/10"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-white/50">Lifestyle tags</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXTRA_VIBES.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleExtra(label)}
              className={`rounded-full px-3 py-1 text-sm ${extraVibes().includes(label) ? "bg-white text-black" : "bg-white/10"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section id="preferences" className="space-y-3">
        <h2 className="font-semibold">Προτιμήσεις</h2>
        <p className="text-sm text-white/60">Gender preference</p>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <button key={g} type="button" onClick={() => toggle(seeking, g, setSeeking)} className={`rounded-full px-3 py-1 text-sm ${seeking.includes(g) ? "bg-white text-black" : "bg-white/10"}`}>
              {g}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          Age range {minAge}–{maxAge}
          <input type="range" min={18} max={99} value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className="mt-2 w-full" />
          <input type="range" min={18} max={99} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="w-full" />
        </label>
        <label className="block text-sm">
          Distance {distance} km
          <input type="range" min={1} max={500} value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <p className="text-sm text-white/60">Looking for</p>
        <div className="flex flex-wrap gap-2">
          {INTENTIONS.map((item) => (
            <button key={item} type="button" onClick={() => toggle(lookingFor, item, setLookingFor)} className={`rounded-full px-3 py-1 text-sm ${lookingFor.includes(item) ? "bg-white text-black" : "bg-white/10"}`}>
              {item.replaceAll("_", " ")}
            </button>
          ))}
        </div>
        {LIFESTYLE_FIELDS.map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              value={lifestyle[key] ?? ""}
              onChange={(e) => setLifestyle({ ...lifestyle, [key]: e.target.value })}
              className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3"
            />
          </label>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Lifestyle</h2>
        <label className="text-sm">Height (cm)
          <input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="mt-1 w-full rounded-2xl bg-white/5 px-4 py-3" />
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY.map((row) => (
            <button key={row.id} type="button" onClick={() => setAvailability(row.id)} className={`rounded-full px-3 py-1 text-sm ${availability === row.id ? "bg-white text-black" : "bg-white/10"}`}>
              {row.label}
            </button>
          ))}
        </div>
        {Object.entries(LIFESTYLE_CHIPS).map(([key, meta]) => (
          <div key={key}>
            <p className="text-sm text-white/60">{meta.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {meta.options.map((option) => (
                <button key={option} type="button" onClick={() => setLifestyle({ ...lifestyle, [key]: option })} className={`rounded-full px-3 py-1 text-sm ${lifestyle[key] === option ? "bg-white text-black" : "bg-white/10"}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">Daily vibe</h2>
        <p className="mt-1 text-sm text-white/60">{dailyVibeFor()}</p>
        <input value={dailyAnswer} maxLength={140} onChange={(e) => setDailyAnswer(e.target.value)} className="mt-2 w-full rounded-2xl bg-white/5 px-4 py-3" placeholder="Your answer for 24 hours" />
      </section>

      <section>
        <h2 className="font-semibold">Voice intro (15s)</h2>
        <input
          type="file"
          accept="audio/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav"
          className="mt-2 text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.set("file", file);
            form.set("durationMs", "15000");
            await api("/api/profiles?type=voice-intro", { method: "POST", body: form });
            toast("Voice intro saved");
          }}
        />
      </section>

      <section>
        <h2 className="font-semibold">Dealbreakers</h2>
        <p className="text-sm text-white/50">Discover hides these quietly.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEALBREAKERS.map((row) => (
            <button key={row.id} type="button" onClick={() => setDealbreakers((list) => list.includes(row.id) ? list.filter((v) => v !== row.id) : [...list, row.id])} className={`rounded-full px-3 py-1 text-sm ${dealbreakers.includes(row.id) ? "bg-rose-500" : "bg-white/10"}`}>
              {row.label}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center justify-between text-sm">
          Smart photo order
          <input type="checkbox" checked={smartOrder} onChange={(e) => setSmartOrder(e.target.checked)} />
        </label>
        <label className="mt-2 flex items-center justify-between text-sm">
          Slow Discover
          <input type="checkbox" checked={slowDiscover} onChange={(e) => setSlowDiscover(e.target.checked)} />
        </label>
      </section>

      <FlirtyButton type="submit" className="w-full" loading={saving} disabled={saving}>
        Save
      </FlirtyButton>
    </form>
  );
}
