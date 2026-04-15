import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { BackArrowIcon, CloseIcon, WriteIcon } from "../../../assets/icons";
import {
  filterLogisticLocations,
  findLocationByValue,
  hasPlacementZoneMismatch,
} from "../../logistic-locations/domain/logistic-locations.domain";
import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import type { LogisticLocationRecord } from "../../logistic-locations/types/logistic-locations.types";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { logisticTasksActions } from "../../logistic-tasks/actions/logistic-tasks.actions";
import { useLogisticTasksStore } from "../../logistic-tasks/stores/logistic-tasks.store";
import {
  LOGISTIC_PLACEMENT_REGION_ID,
  useLogisticPlacementScannerFlow,
} from "../flows/use-logistic-placement-scanner.flow";
import { useScannerLogisticPlacementStore } from "../stores/scanner-logistic-placement.store";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";

export function ScannerLogisticPlacementPage() {
  const scanHistoryId = useScannerLogisticPlacementStore(
    (s) => s.scanHistoryId,
  );
  const confirmedLocationId = useScannerLogisticPlacementStore(
    (s) => s.confirmedLocationId,
  );
  const confirmedLocationName = useScannerLogisticPlacementStore(
    (s) => s.confirmedLocationName,
  );
  const warning = useScannerLogisticPlacementStore((s) => s.warning);
  const isPlacing = useScannerLogisticPlacementStore((s) => s.isPlacing);
  const locations = useLogisticLocationsStore((s) => s.locations);
  const item = useLogisticTasksStore(
    (s) => s.items.find((i) => i.id === scanHistoryId) ?? null,
  );

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQuery, setManualQuery] = useState("");

  const handleConfirmLocation = (match: LogisticLocationRecord) => {
    if (!scanHistoryId) return;

    useScannerLogisticPlacementStore.getState().setWarning(null);

    const needsFixCheck =
      item &&
      item.fixItem === true &&
      item.isItemFixed === false &&
      match.zoneType !== "for_fixing";

    const needsZoneCheck =
      item &&
      hasPlacementZoneMismatch(item.intention, match.zoneType, item.fixItem);

    if (needsFixCheck || needsZoneCheck) {
      useScannerLogisticPlacementStore
        .getState()
        .setPendingPlacementMatch(match);
      // Flag zone mismatch so it can be shown after the fix check resolves
      useScannerLogisticPlacementStore
        .getState()
        .setRequiresZoneMismatchConfirm(!!needsZoneCheck);

      // Fix check always goes first when present
      homeShellActions.popupFeaturePage(
        needsFixCheck
          ? "placement-item-fixed-check"
          : "placement-zone-mismatch",
      );
      return;
    }

    // No guards triggered — place immediately
    useScannerLogisticPlacementStore
      .getState()
      .setConfirmedLocation(match.id, match.location);
    void logisticTasksActions.markPlacement(scanHistoryId, match.id);
  };

  const handleDecode = (value: string) => {
    if (!scanHistoryId) return;

    const match = findLocationByValue(locations, value);
    if (!match) {
      useScannerLogisticPlacementStore
        .getState()
        .setWarning(`Location "${value}" not recognised.`);
      return;
    }

    handleConfirmLocation(match);
  };

  const { isCameraReady, cameraError } =
    useLogisticPlacementScannerFlow(handleDecode);

  const filteredLocations = filterLogisticLocations(locations, manualQuery);
  const isConfirmed = confirmedLocationId !== null;

  return (
    <section
      className="relative h-svh w-full overflow-hidden bg-slate-950"
      aria-label="Logistic placement scanner"
    >
      {/* Camera region — always mounted so the ZXing video element can attach */}
      <div
        id={LOGISTIC_PLACEMENT_REGION_ID}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Scanner guide reticle */}
      {!isConfirmed && <ScannerGuideOverlay isFrozen={false} />}

      {/* Camera not ready */}
      {!isConfirmed && !isCameraReady && !cameraError ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/60 text-sm font-semibold text-slate-100">
          Opening camera...
        </div>
      ) : null}

      {/* Camera error */}
      {!isConfirmed && cameraError ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/60 p-6 text-center text-sm font-semibold text-rose-100">
          {cameraError}
        </div>
      ) : null}

      {/* ── State A: Scanning ── */}
      {!isConfirmed ? (
        <>
          {/* Top action bar */}
          <header
            className="absolute inset-x-0 top-0 z-30 flex items-center px-4 pb-3"
            style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          >
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-slate-950/40 text-slate-100 ring-1 ring-white/25"
              onClick={logisticTasksActions.closePlacementScanner}
              aria-label="Back"
            >
              <BackArrowIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-slate-950/40 px-4 py-2 text-sm font-semibold text-slate-100">
              Scan Location
            </div>
          </header>

          {/* Warning banner */}
          {warning ? (
            <div
              className="absolute left-4 right-4 z-30 rounded-xl bg-rose-700/90 px-4 py-3 text-sm text-white shadow"
              style={{
                bottom: "max(6rem, calc(env(safe-area-inset-bottom) + 5rem))",
              }}
            >
              <p className="m-0">{warning}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-rose-200 underline"
                onClick={() =>
                  useScannerLogisticPlacementStore.getState().setWarning(null)
                }
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {/* Manual input trigger — bottom right */}
          {!showManualInput && (
            <button
              type="button"
              className="absolute z-30 grid h-12 w-12 place-items-center rounded-full bg-slate-950/50 text-slate-100 ring-1 ring-white/25"
              style={{
                bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1.5rem))",
                right: "1.25rem",
              }}
              onClick={() => {
                setManualQuery("");
                setShowManualInput(true);
              }}
              aria-label="Type location manually"
            >
              <WriteIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </>
      ) : null}

      {/* Manual input panel — stable AnimatePresence at section level */}
      <AnimatePresence>
        {showManualInput && (
          <motion.div
            className="absolute inset-0 z-40 flex flex-col bg-slate-50"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <header className="flex items-center gap-2 border-b border-slate-900/15 px-4 py-4">
              <input
                type="search"
                className="h-11 flex-1 rounded-xl border border-slate-800/20 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Search location"
                aria-label="Search location"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <button
                type="button"
                className="grid h-8 w-8 place-items-center text-sm font-bold text-slate-800"
                onClick={() => setShowManualInput(false)}
                aria-label="Close manual input"
              >
                <CloseIcon
                  className="h-5 w-5 text-green-700"
                  aria-hidden="true"
                />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
              {filteredLocations.length === 0 ? (
                <p className="text-sm text-slate-500">No locations found.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {filteredLocations.map((loc) => (
                    <li key={loc.id}>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-slate-800/20 bg-white p-3 text-left text-sky-900"
                        onClick={() => {
                          setShowManualInput(false);
                          handleConfirmLocation(loc);
                        }}
                      >
                        {loc.location}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── State B: Placement confirmed ── */}
      {isConfirmed ? (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-slate-950 px-6"
          style={{
            paddingTop: "max(1.5rem, env(safe-area-inset-top))",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
          }}
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

            <p className="m-0 text-base font-semibold text-slate-300">
              Placed at
            </p>
            <p className="m-0 text-2xl font-bold text-white">
              {confirmedLocationName}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              className="w-full rounded-xl border border-white/15 bg-white/10 py-3 text-sm font-semibold text-slate-100 active:bg-white/20"
              onClick={() =>
                useScannerLogisticPlacementStore
                  .getState()
                  .setConfirmedLocation(null, null)
              }
            >
              Change Location
            </button>

            <button
              type="button"
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white active:bg-emerald-700 disabled:opacity-50"
              disabled={isPlacing}
              onClick={logisticTasksActions.closePlacementScanner}
            >
              {isPlacing ? "Completing..." : "Complete"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
