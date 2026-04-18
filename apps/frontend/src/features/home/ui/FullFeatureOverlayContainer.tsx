import { AnimatePresence, motion } from "framer-motion";
import type { ComponentType } from "react";

interface FullFeatureOverlayContainerProps {
  isOpen: boolean;
  title: string;
  ActiveFeatureComponent: ComponentType | null;
}

export function FullFeatureOverlayContainer({
  isOpen,
  title,
  ActiveFeatureComponent,
}: FullFeatureOverlayContainerProps) {
  return (
    <AnimatePresence>
      {isOpen && ActiveFeatureComponent ? (
        <motion.section
          className="fixed inset-0 z-50 bg-slate-950"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <div className="h-svh overflow-y-auto">
            <ActiveFeatureComponent />
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
