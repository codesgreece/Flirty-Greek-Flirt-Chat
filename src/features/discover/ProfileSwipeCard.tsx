"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { BadgeCheck, ChevronDown, Heart, Info, MapPin } from "lucide-react";
import { motionTokens } from "@/lib/motion";
import { formatIntention } from "@/lib/format";
import type { DiscoverCard } from "@/features/discover/types";

export function ProfileSwipeCard({
  card,
  index,
  active,
  expanded,
  onToggleExpand,
  onLike,
  onPass,
  onReport,
}: {
  card: DiscoverCard;
  index: number;
  active: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onLike: (focus?: { focusType?: "photo" | "prompt" | "vibe"; focusLabel?: string; photoId?: string }) => void;
  onPass: () => void;
  onReport: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOp = useTransform(x, [40, 140], [0, 1]);
  const passOp = useTransform(x, [-140, -40], [1, 0]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = card.photos.length ? card.photos : [{ id: "fallback", src: "/avatars/fallback.svg", thumb: "/avatars/fallback.svg" }];
  const photo = photos[Math.min(photoIndex, photos.length - 1)]!;

  return (
    <motion.article
      className="absolute inset-0 overflow-hidden rounded-[1.35rem] bg-ink-800 shadow-card"
      style={{
        x: active && !expanded ? x : 0,
        rotate: active && !expanded ? rotate : 0,
        scale: expanded ? 1 : 1 - index * 0.035,
        y: expanded ? 0 : index * 6,
        zIndex: 10 - index,
      }}
      drag={active && !expanded ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.88}
      transition={motionTokens.cardSpring}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120 || info.velocity.x > 700) onLike();
        else if (info.offset.x < -120 || info.velocity.x < -700) onPass();
      }}
    >
      {expanded ? (
        <ExpandedProfile
          card={card}
          photos={photos}
          onCollapse={onToggleExpand}
          onLike={onLike}
          onReport={onReport}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo.src})` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/25" />
          <div className="absolute inset-x-0 top-0 z-10 flex h-[72%]">
            <button
              type="button"
              className="w-[30%]"
              aria-label="Previous photo"
              onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
            />
            <button
              type="button"
              className="flex-1"
              aria-label="Next photo"
              onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))}
            />
          </div>
          <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
            {photos.map((item, i) => (
              <span key={item.id} className={`h-[3px] flex-1 rounded-full ${i === photoIndex ? "bg-white" : "bg-white/35"}`} />
            ))}
          </div>
          <motion.div
            style={{ opacity: likeOp }}
            className="pointer-events-none absolute left-4 top-10 -rotate-12 rounded-md border-4 border-emerald-400 px-3 py-1 text-2xl font-extrabold tracking-widest text-emerald-400"
          >
            LIKE
          </motion.div>
          <motion.div
            style={{ opacity: passOp }}
            className="pointer-events-none absolute right-4 top-10 rotate-12 rounded-md border-4 border-rose-400 px-3 py-1 text-2xl font-extrabold tracking-widest text-rose-400"
          >
            NOPE
          </motion.div>
          <div className="absolute inset-x-0 bottom-0 z-20 p-4 pb-5">
            {card.secondChance ? (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200">Second chance</p>
            ) : null}
            <div className="flex items-end gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={onToggleExpand}>
                <h2 className="flex items-center gap-1.5 truncate text-[1.85rem] font-extrabold leading-none">
                  {card.name}, {card.age}
                  {card.verified ? <BadgeCheck className="h-5 w-5 shrink-0 text-sky-400" /> : null}
                </h2>
                <p className="mt-2 flex items-center gap-1 text-sm text-white/80">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {card.distanceLabel ?? card.city}
                </p>
              </button>
              <button
                type="button"
                aria-label="Open profile"
                className="mb-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white/80 text-white"
                onClick={onToggleExpand}
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </motion.article>
  );
}

function ExpandedProfile({
  card,
  photos,
  onCollapse,
  onLike,
  onReport,
}: {
  card: DiscoverCard;
  photos: { id: string; src: string; thumb: string }[];
  onCollapse: () => void;
  onLike: (focus?: { focusType?: "photo" | "prompt" | "vibe"; focusLabel?: string; photoId?: string }) => void;
  onReport: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto bg-ink-950">
      <div className="relative">
        <div className="aspect-[3/4] bg-cover bg-center" style={{ backgroundImage: `url(${photos[0]?.src ?? ""})` }} />
        <button
          type="button"
          aria-label="Close profile"
          className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-flirty-pink text-white shadow-glow"
          onClick={onCollapse}
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
      <div className="space-y-5 px-5 py-5">
        <div>
          <h2 className="flex items-center gap-1.5 text-3xl font-extrabold">
            {card.name}, {card.age}
            {card.verified ? <BadgeCheck className="h-5 w-5 text-sky-400" /> : null}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/65">
            <MapPin className="h-3.5 w-3.5" />
            {card.distanceLabel ?? card.city}
          </p>
          <p className="mt-1 text-sm text-white/55">Looking for {formatIntention(card.intention)}</p>
        </div>

        {card.bio ? <p className="text-[15px] leading-relaxed text-white/85">{card.bio}</p> : null}

        {card.prompts.map((prompt) => (
          <button
            key={prompt.question}
            type="button"
            className="w-full rounded-2xl bg-white/5 p-4 text-left"
            onClick={() => onLike({ focusType: "prompt", focusLabel: prompt.answer })}
          >
            <p className="text-xs text-white/45">{prompt.question}</p>
            <p className="mt-2 text-lg font-semibold">{prompt.answer}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-300">
              <Heart className="h-3.5 w-3.5" /> Like
            </span>
          </button>
        ))}

        {photos.slice(1).map((item) => (
          <button
            key={item.id}
            type="button"
            className="block w-full overflow-hidden rounded-2xl"
            onClick={() => onLike({ focusType: "photo", focusLabel: "this photo", photoId: item.id !== "fallback" ? item.id : undefined })}
          >
            <div className="aspect-[3/4] bg-cover bg-center" style={{ backgroundImage: `url(${item.src})` }} />
          </button>
        ))}

        {card.interests.length || card.vibes.length || card.chips?.length ? (
          <section>
            <h3 className="text-sm font-semibold">Interests</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {card.vibes.map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  className="rounded-full bg-indigo-500/25 px-3 py-1.5 text-sm"
                  onClick={() => onLike({ focusType: "vibe", focusLabel: vibe })}
                >
                  {vibe}
                </button>
              ))}
              {card.interests.map((item) => (
                <span key={item} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
                  {item}
                </span>
              ))}
              {card.chips?.map((chip) => (
                <span key={chip} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
                  {chip}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {card.dailyVibe ? (
          <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm">Today: {card.dailyVibe.answer}</p>
        ) : null}
        {card.voiceIntro ? <audio className="w-full" controls src={card.voiceIntro.src} /> : null}

        <p className="text-xs text-white/40">{card.compatibility.score}% match</p>

        <button type="button" className="w-full py-3 text-sm text-rose-300" onClick={onReport}>
          Report
        </button>
      </div>
    </div>
  );
}
