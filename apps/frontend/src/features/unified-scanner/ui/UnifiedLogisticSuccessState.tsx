import { motion } from "framer-motion";

interface UnifiedLogisticSuccessStateProps {
  locationLabel: string;
  onChangeLocation: () => void;
  onDone: () => void;
}

export function UnifiedLogisticSuccessState({
  locationLabel,
  onChangeLocation,
  onDone,
}: UnifiedLogisticSuccessStateProps) {
  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-slate-950 px-6"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-600/20 ring-2 ring-emerald-400">
          <svg
            className="h-8 w-8 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <p className="m-0 text-base font-semibold text-slate-300">Placed at</p>
        <p className="m-0 text-2xl font-bold text-white">{locationLabel}</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          className="w-full rounded-xl border border-white/15 bg-white/10 py-3 text-sm font-semibold text-slate-100 active:bg-white/20"
          onClick={onChangeLocation}
        >
          Change Location
        </button>

        <button
          type="button"
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white active:bg-emerald-700"
          onClick={onDone}
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}
