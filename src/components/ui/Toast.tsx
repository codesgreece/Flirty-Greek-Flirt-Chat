"use client";

import { motion, AnimatePresence } from "framer-motion";

export type Toast = { id: string; message: string };

export function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-8">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="pointer-events-auto glass rounded-full px-4 py-2 text-sm"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {toast.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
