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
  zIndexClassName?: string;
}

export function SlidingOverlayContainer({
  isOpen,
  title,
  children,
  zIndexClassName = "z-60",
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
          <div
            className={`fixed inset-0 ${zIndexClassName}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <motion.div
              className="absolute inset-0 bg-slate-950/24 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />

            <motion.section
              className="relative flex h-svh min-h-0 flex-col overflow-hidden"
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
              {children}
            </motion.section>
          </div>
        ) : null}
      </AnimatePresence>
    </SlidingOverlayReadyContext.Provider>
  );
}
