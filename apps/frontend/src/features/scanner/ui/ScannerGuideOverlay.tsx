import { motion } from "framer-motion";

interface ScannerGuideOverlayProps {
  isFrozen: boolean;
}

export function ScannerGuideOverlay({ isFrozen }: ScannerGuideOverlayProps) {
  const guideOffsetTopPx = -100;
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
      style={{ transform: `translateY(${guideOffsetTopPx}px)` }}
    >
      <motion.div
        className="relative h-[min(62svh,62vw)] w-[min(62svh,62vw)] max-h-[420px] max-w-[420px] min-h-[220px] min-w-[220px]"
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
