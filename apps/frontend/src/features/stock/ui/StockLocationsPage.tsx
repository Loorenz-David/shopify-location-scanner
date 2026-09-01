import { useEffect, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../../../assets/icons";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { stockActions } from "../actions/stock.actions";
import { useStockSettingsFlow } from "../flows/use-stock-settings.flow";
import {
  selectStockNavigationCurrentView,
  useStockNavigationStore,
} from "../stores/stock-navigation.store";
import {
  selectStockLocations,
  selectStockSelectedLocation,
  selectStockSettingsErrorMessage,
  selectStockSettingsIsLoading,
  useStockSettingsStore,
} from "../stores/stock-settings.store";
import {
  selectStockWizardErrorMessage,
  useStockWizardStore,
} from "../stores/stock-wizard.store";
import { StockFloatingPill } from "./StockFloatingPill";
import { StockLocationDetailView } from "./StockLocationDetailView";

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

async function openWizard(start: Promise<void>): Promise<void> {
  try {
    await start;
    stockActions.pushView("wizard-step1");
  } catch {
    // The controller already surfaced the error in the wizard store.
  }
}

interface StockLocationsRootViewProps {
  onOpenLocation: (location: string) => void;
}

function StockLocationsRootView({ onOpenLocation }: StockLocationsRootViewProps) {
  useStockSettingsFlow();
  const locations = useStockSettingsStore(selectStockLocations);
  const isLoading = useStockSettingsStore(selectStockSettingsIsLoading);
  const settingsErrorMessage = useStockSettingsStore(selectStockSettingsErrorMessage);
  const wizardErrorMessage = useStockWizardStore(selectStockWizardErrorMessage);

  const totalInstances = locations.reduce((sum, { stockCount }) => sum + stockCount, 0);
  const errorMessage = settingsErrorMessage ?? wizardErrorMessage;
  const isInitialLoad = isLoading && locations.length === 0;

  return (
    <section className="stock-area-font mx-auto flex w-full max-w-[720px] flex-col gap-3 px-5 pb-10">
      <header className="flex items-start gap-3">
        <button
          type="button"
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--stock-surface)] text-[var(--stock-heading)] shadow-[var(--stock-card-shadow)]"
          onClick={() => homeShellActions.selectNavigationPage("settings")}
          aria-label="Back to settings"
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 pt-0.5">
          <h1 className="m-0 text-[21px] font-bold leading-tight text-[var(--stock-heading)]">
            Stock locations
          </h1>
          <p className="m-0 mt-0.5 text-[15px] text-[var(--stock-body)]">
            {pluralize(locations.length, "location")} ·{" "}
            {pluralize(totalInstances, "stock instance")}
          </p>
        </div>
      </header>

      <p className="m-0 text-[15px] leading-snug text-[var(--stock-body)]">
        Thresholds set here decide how stock is read in the report.
      </p>

      {errorMessage ? (
        <div className="rounded-[16px] border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-1 flex flex-col gap-3">
        {isInitialLoad ? (
          <>
            <div className="h-[92px] animate-pulse rounded-[24px] bg-white/70" />
            <div className="h-[92px] animate-pulse rounded-[24px] bg-white/70" />
          </>
        ) : null}

        {!isInitialLoad && locations.length === 0 ? (
          <div className="rounded-[24px] bg-[var(--stock-surface)] px-5 py-6 shadow-[var(--stock-card-shadow)]">
            <p className="m-0 text-[17px] font-bold text-[var(--stock-heading)]">
              No stock locations yet
            </p>
            <p className="m-0 mt-1 text-[15px] leading-snug text-[var(--stock-body)]">
              Pick a location below and configure its first stock instance. The report
              only counts items that match a configured instance.
            </p>
          </div>
        ) : null}

        {locations.map(({ location, stockCount }) => (
          <button
            key={location}
            type="button"
            data-testid="stock-location-row"
            className="flex w-full items-center gap-4 rounded-[24px] bg-[var(--stock-surface)] px-4 py-4 text-left shadow-[var(--stock-card-shadow)]"
            onClick={() => onOpenLocation(location)}
          >
            <span className="stock-mono grid h-[52px] min-w-[52px] flex-shrink-0 place-items-center rounded-[16px] bg-[var(--stock-code-badge-bg)] px-2 text-[15px] font-medium text-[var(--stock-primary)]">
              {location}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[17px] font-bold leading-tight text-[var(--stock-heading)]">
                {location}
              </span>
              <span className="mt-0.5 text-[15px] text-[var(--stock-body)]">
                {pluralize(stockCount, "stock instance")} configured
              </span>
            </span>
            <ChevronRightIcon
              className="h-5 w-5 flex-shrink-0 text-[var(--stock-dashed)]"
              aria-hidden="true"
            />
          </button>
        ))}

        <button
          type="button"
          className="flex w-full items-center gap-4 rounded-[24px] border-2 border-dashed border-[var(--stock-dashed)] px-4 py-4 text-left"
          onClick={() => void openWizard(stockActions.startNewWizardFromRoot())}
        >
          <span className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center rounded-[16px] bg-[var(--stock-track)] text-[var(--stock-muted)]">
            <PlusIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] font-bold leading-tight text-[var(--stock-muted)]">
              New location
            </span>
            <span className="mt-0.5 text-[15px] text-[var(--stock-faint)]">
              Zones without instances
            </span>
          </span>
        </button>
      </div>

      <StockFloatingPill
        label="New instance"
        onPress={() => void openWizard(stockActions.startNewWizardFromRoot())}
      />
    </section>
  );
}

// Placeholder until P6 ships the wizard screens (08–09); keeps the demo from dead-ending.
function StockWizardPendingView() {
  return (
    <section className="stock-area-font mx-auto flex w-full max-w-[720px] flex-col gap-3 px-5">
      <header className="flex items-center gap-3">
        <button
          type="button"
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--stock-surface)] text-[var(--stock-heading)] shadow-[var(--stock-card-shadow)]"
          onClick={() => stockActions.popView()}
          aria-label="Back"
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="m-0 text-[21px] font-bold leading-tight text-[var(--stock-heading)]">
          Stock instance
        </h1>
      </header>
      <div className="rounded-[24px] bg-[var(--stock-surface)] px-5 py-6 text-[15px] text-[var(--stock-body)] shadow-[var(--stock-card-shadow)]">
        The instance wizard arrives with the next build phase.
      </div>
    </section>
  );
}

export function StockLocationsPage() {
  const currentView = useStockNavigationStore(selectStockNavigationCurrentView);
  const selectedLocation = useStockSettingsStore(selectStockSelectedLocation);
  const [detailLocation, setDetailLocation] = useState<string | null>(null);

  // Entering from Settings always lands on the root, whatever view an earlier visit left behind.
  useEffect(() => {
    stockActions.resetNavigation();
  }, []);

  const openLocation = (location: string) => {
    setDetailLocation(location);
    stockActions.pushView("location-detail");
  };

  if (currentView === "location-detail") {
    const location = detailLocation ?? selectedLocation;
    if (location !== null) {
      return <StockLocationDetailView location={location} />;
    }
  }

  if (currentView === "wizard-step1" || currentView === "wizard-step2") {
    return <StockWizardPendingView />;
  }

  return <StockLocationsRootView onOpenLocation={openLocation} />;
}
