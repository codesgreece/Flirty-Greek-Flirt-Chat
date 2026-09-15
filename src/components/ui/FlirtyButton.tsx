"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { motionTokens } from "@/lib/motion";

type Props = {
  variant?: "primary" | "ghost" | "danger" | "gold";
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
};

export function FlirtyButton({
  variant = "primary",
  loading,
  className,
  children,
  type = "submit",
  disabled,
  onClick,
}: Props) {
  const styles = {
    primary: "bg-gradient-to-r from-flirty-pink to-[#7c3aed] text-white shadow-glow",
    ghost: "bg-white/5 text-white border border-white/10",
    danger: "bg-red-500/20 text-red-100 border border-red-400/20",
    gold: "bg-gradient-to-r from-amber-300 to-fuchsia-400 text-ink-950",
  }[variant];
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      transition={motionTokens.spring}
      className={cn(
        "btn-press focus-ring inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-50",
        styles,
        className,
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? "Please wait…" : children}
    </motion.button>
  );
}
