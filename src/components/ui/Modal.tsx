"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { motionTokens } from "@/lib/motion";

export function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={cn("glass mb-20 w-full max-w-lg rounded-t-3xl p-5 md:mb-0 md:rounded-3xl")}
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: motionTokens.normal }}
            onClick={(e) => e.stopPropagation()}
          >
            {title ? <h3 className="mb-3 text-lg font-bold">{title}</h3> : null}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(panel, document.body);
}

export function UpgradeModal({
  open,
  onClose,
  title,
  body,
  required,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  required: string;
  onUpgrade: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-white/70">{body}</p>
      <p className="mt-3 text-sm">
        Available with <span className="font-semibold text-flirty-pink">FLIRTY {required}</span>.
      </p>
      <div className="mt-5 flex gap-3">
        <button className="flex-1 rounded-full bg-white/10 py-3" onClick={onClose} type="button">
          Not now
        </button>
        <button
          className="flex-1 rounded-full bg-gradient-to-r from-flirty-pink to-indigo-500 py-3 font-semibold"
          onClick={onUpgrade}
          type="button"
        >
          See plans
        </button>
      </div>
    </Modal>
  );
}
