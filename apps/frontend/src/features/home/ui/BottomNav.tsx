import { motion } from "framer-motion";
import { QRcodeIcon } from "../../../assets/icons";

import type { BottomMenuItem, HomePageId } from "../types/home-shell.types";

interface BottomNavProps {
  items: BottomMenuItem[];
  onSelectPage: (pageId: HomePageId) => void;
}

function getSlotItem(items: BottomMenuItem[], slot: BottomMenuItem["slot"]) {
  return items.find((item) => item.slot === slot);
}

export function BottomNav({ items, onSelectPage }: BottomNavProps) {
  const left = getSlotItem(items, "left");
  const center = getSlotItem(items, "center");
  const right = getSlotItem(items, "right");

  return (
    <motion.nav
      className="fixed left-1/2 z-30 grid w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2 grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-full border border-slate-900/20 bg-white/85 p-2 shadow-[0_16px_35px_rgba(18,44,77,0.22)] backdrop-blur-md"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      initial={{ y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      aria-label="Primary navigation"
    >
      <div className="flex min-h-11 items-center justify-start">
        {left ? (
          <button
            type="button"
            className={`rounded-full bg-transparent px-4 py-2 text-sm font-semibold leading-none ${
              left.isActive ? "text-blue-400" : "text-slate-700"
            }`}
            onClick={() => onSelectPage(left.id)}
          >
            {left.label}
          </button>
        ) : null}
      </div>

      <div className="flex min-h-11 items-center justify-center">
        {center ? (
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-emerald-600 to-emerald-700 text-emerald-50 shadow-[0_12px_24px_rgba(16,122,102,0.25)]"
            onClick={() => onSelectPage(center.id)}
            aria-label={center.label}
          >
            <QRcodeIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-11 items-center justify-end">
        {right ? (
          <button
            type="button"
            className={`rounded-full bg-transparent px-4 py-2 text-sm font-semibold leading-none ${
              right.isActive ? "text-blue-400" : "text-slate-700"
            }`}
            onClick={() => onSelectPage(right.id)}
          >
            {right.label}
          </button>
        ) : null}
      </div>
    </motion.nav>
  );
}
