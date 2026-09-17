"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function ImageViewer({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: { src: string; alt?: string }[];
  index: number;
  onClose: () => void;
  onIndex?: (index: number) => void;
}) {
  const [current, setCurrent] = useState(index);
  useEffect(() => setCurrent(index), [index]);
  if (!photos.length) return null;
  const photo = photos[current] ?? photos[0];
  if (!photo) return null;
  function go(delta: number) {
    const next = (current + delta + photos.length) % photos.length;
    setCurrent(next);
    onIndex?.(next);
  }
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <button type="button" className="absolute left-4 top-4 text-sm text-white/70" onClick={onClose}>
          Close
        </button>
        <p className="absolute right-4 top-4 text-sm text-white/60">
          {current + 1} / {photos.length}
        </p>
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
            >
              ›
            </button>
          </>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.alt ?? ""}
          className="max-h-[88dvh] max-w-full rounded-2xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </motion.div>
    </AnimatePresence>
  );
}
