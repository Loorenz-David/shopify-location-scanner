import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { SlidingOverlayReadyContext } from "./sliding-overlay-ready.context";

const slideVariants = {
  hidden: { y: "100%" },
  visible: { y: 0 },
};

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
  const [isReady, setIsReady] = useState(false);

  // Prevent iOS Safari from scrolling the underlying document when the
  // overlay is open (e.g. when the virtual keyboard pushes the viewport).
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  return (
    <SlidingOverlayReadyContext.Provider value={isReady}>
      <AnimatePresence>
        {isOpen ? (
          <motion.section
            className="fixed inset-0 z-60 bg-slate-50"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.25, ease: "easeOut" }}
            onAnimationStart={(definition) => {
              if (definition === "visible") {
                setIsReady(false);
              }
            }}
            onAnimationComplete={(definition) => {
              if (definition === "visible") {
                setIsReady(true);
                return;
              }

              if (definition === "hidden") {
                setIsReady(false);
              }
            }}
          >
            <div className="flex h-svh min-h-0 flex-col overflow-hidden">
              {children}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </SlidingOverlayReadyContext.Provider>
  );
}
