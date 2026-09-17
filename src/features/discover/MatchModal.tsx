"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FlirtyButton } from "@/components/ui/FlirtyButton";

export function MatchModal({
  open,
  name,
  score,
  photo,
  myPhoto,
  onKeep,
  onMessage,
}: {
  open: boolean;
  name: string;
  score: number;
  photo?: string;
  myPhoto?: string;
  onKeep: () => void;
  onMessage: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="relative w-full max-w-md text-center">
            <div className="flex items-center justify-center gap-4">
              <motion.div
                className="h-28 w-28 rounded-full border-2 border-white/20 bg-gradient-to-br from-pink-400 to-indigo-500 bg-cover bg-center"
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                style={{ backgroundImage: myPhoto ? `url(${myPhoto})` : undefined }}
              />
              <motion.span className="text-3xl" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35 }}>
                ❤️
              </motion.span>
              <motion.div
                className="h-28 w-28 rounded-full border-2 border-white/20 bg-gradient-to-br from-indigo-400 to-pink-500 bg-cover bg-center"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                style={{ backgroundImage: photo ? `url(${photo})` : undefined }}
              />
            </div>
            <motion.h2 className="mt-8 text-4xl font-extrabold" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}>
              IT&apos;S A MATCH
            </motion.h2>
            <p className="mt-2 text-white/70">You both liked each other.</p>
            <motion.p className="mt-1 text-flirty-pink" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
              {score}% Vibe Match · {name}
            </motion.p>
            <motion.div className="mt-8 flex flex-col gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <FlirtyButton type="button" onClick={onMessage}>
                Send Message
              </FlirtyButton>
              <FlirtyButton type="button" variant="ghost" onClick={onKeep}>
                Keep Discovering
              </FlirtyButton>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
