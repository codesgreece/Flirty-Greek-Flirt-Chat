"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { motionTokens } from "@/lib/motion";

const sizes = {
  sm: "h-12 w-12",
  md: "h-[3.65rem] w-[3.65rem]",
  lg: "h-[4.35rem] w-[4.35rem]",
} as const;

const tones = {
  pass: "border-[2.5px] border-rose-400 text-rose-400",
  like: "border-[2.5px] border-emerald-400 text-emerald-400",
  super: "border-[2.5px] border-sky-400 text-sky-400",
  rewind: "border-2 border-amber-400 text-amber-400",
  boost: "border-2 border-violet-400 text-violet-300",
  info: "border-2 border-white/35 text-white",
} as const;

export function CircleAction({
  label,
  onClick,
  size = "md",
  tone,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  size?: keyof typeof sizes;
  tone: keyof typeof tones;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      transition={motionTokens.spring}
      onClick={onClick}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-black/55 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md disabled:opacity-40",
        sizes[size],
        tones[tone],
      )}
    >
      {children}
    </motion.button>
  );
}
