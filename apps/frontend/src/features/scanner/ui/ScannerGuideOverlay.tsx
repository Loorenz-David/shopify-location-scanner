import { motion } from "framer-motion";

import {
  SCANNER_GUIDE_MAX_SIZE_PX,
  SCANNER_GUIDE_MIN_SIZE_PX,
  SCANNER_GUIDE_OFFSET_TOP_PX,
  SCANNER_GUIDE_VIEWPORT_SIZE_RATIO,
} from "../domain/scanner-guide.domain";

interface ScannerGuideOverlayProps {
  isFrozen: boolean;
}

export function ScannerGuideOverlay({ isFrozen }: ScannerGuideOverlayProps) {
  const frameClass = isFrozen ? "border-emerald-300/60" : "border-sky-100/35";
  const cornerClass = isFrozen ? "border-emerald-300" : "border-sky-200";
  const pulseTransition = {
    duration: 0.42,
    times: [0, 0.42, 1],
    ease: "easeOut" as const,
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-6"
      style={{ transform: `translateY(${SCANNER_GUIDE_OFFSET_TOP_PX}px)` }}
    >
      <motion.div
        className="relative"
        style={{
          width: `min(${SCANNER_GUIDE_VIEWPORT_SIZE_RATIO * 100}svh, ${SCANNER_GUIDE_VIEWPORT_SIZE_RATIO * 100}vw)`,
          height: `min(${SCANNER_GUIDE_VIEWPORT_SIZE_RATIO * 100}svh, ${SCANNER_GUIDE_VIEWPORT_SIZE_RATIO * 100}vw)`,
          minWidth: `${SCANNER_GUIDE_MIN_SIZE_PX}px`,
          minHeight: `${SCANNER_GUIDE_MIN_SIZE_PX}px`,
          maxWidth: `${SCANNER_GUIDE_MAX_SIZE_PX}px`,
          maxHeight: `${SCANNER_GUIDE_MAX_SIZE_PX}px`,
        }}
        animate={{ scale: isFrozen ? [1, 1.065, 1] : 1 }}
        transition={pulseTransition}
      >
        <motion.div
          className="absolute inset-0 rounded-[24px]"
          animate={{
            boxShadow: isFrozen
              ? "0 0 0 9999px rgba(2, 8, 23, 0.56)"
              : "0 0 0 9999px rgba(2, 8, 23, 0)",
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        />

        <div
          className={`relative h-full w-full rounded-[24px] border ${frameClass}`}
        >
          <span
            className={`absolute -left-0.5 -top-0.5 h-12 w-12 rounded-tl-[22px] border-l-4 border-t-4 ${cornerClass}`}
          />
          <span
            className={`absolute -right-0.5 -top-0.5 h-12 w-12 rounded-tr-[22px] border-r-4 border-t-4 ${cornerClass}`}
          />
          <span
            className={`absolute -bottom-0.5 -left-0.5 h-12 w-12 rounded-bl-[22px] border-b-4 border-l-4 ${cornerClass}`}
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-12 w-12 rounded-br-[22px] border-b-4 border-r-4 ${cornerClass}`}
          />
        </div>
      </motion.div>
    </div>
  );
}
