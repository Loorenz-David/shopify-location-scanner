import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

interface SlidingOverlayContainerProps {
  isOpen: boolean;
  title: string;
  children?: ReactNode;
}

export function SlidingOverlayContainer({
  isOpen,
  title,
  children,
}: SlidingOverlayContainerProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.section
          className="fixed inset-0 z-60 bg-slate-50"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="flex h-svh min-h-0 flex-col overflow-hidden">
            {children}
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
