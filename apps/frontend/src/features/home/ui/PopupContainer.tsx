import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

import { CloseIcon } from "../../../assets/icons";

interface PopupContainerProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
}

export function PopupContainer({
  isOpen,
  onClose,
  children,
}: PopupContainerProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center px-4"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* Dark backdrop — tap outside to close */}
          <motion.div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* White container */}
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200"
              onClick={onClose}
            >
              <CloseIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
