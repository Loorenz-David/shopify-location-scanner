import { motion } from "framer-motion";
import { QRcodeIcon } from "../../../assets/icons";

import type { BottomMenuItem, HomePageId } from "../types/home-shell.types";

interface BottomNavProps {
  items: BottomMenuItem[];
  onSelectPage: (pageId: HomePageId) => void;
}

export function BottomNav({ items, onSelectPage }: BottomNavProps) {
  return (
    <motion.nav
      className="fixed left-1/2 z-30 flex w-[min(520px,calc(100vw-1.5rem))] -translate-x-1/2 items-center justify-between gap-2 rounded-full border border-slate-900/20 bg-white/85 p-2 shadow-[0_16px_35px_rgba(18,44,77,0.22)] backdrop-blur-md"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      initial={{ y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      aria-label="Primary navigation"
    >
      {items.map((item) =>
        item.id === "scanner" ? (
          <button
            key={item.id}
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-emerald-600 to-emerald-700 text-emerald-50 shadow-[0_12px_24px_rgba(16,122,102,0.25)]"
            onClick={() => onSelectPage(item.id)}
            aria-label={item.label}
          >
            <QRcodeIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : (
          <button
            key={item.id}
            type="button"
            className={`rounded-full bg-transparent px-4 py-2 text-sm font-semibold leading-none ${
              item.isActive ? "text-blue-400" : "text-slate-700"
            }`}
            onClick={() => onSelectPage(item.id)}
          >
            {item.label}
          </button>
        ),
      )}
    </motion.nav>
  );
}
