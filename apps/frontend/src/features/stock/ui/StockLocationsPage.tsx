import { useEffect, useState } from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "../../../assets/icons";
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
import { StockWizardStep1View } from "./StockWizardStep1View";
import { StockWizardStep2View } from "./StockWizardStep2View";

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

function StockLocationsRootView({
  onOpenLocation,
}: StockLocationsRootViewProps) {
  useStockSettingsFlow();
  const locations = useStockSettingsStore(selectStockLocations);
  const isLoading = useStockSettingsStore(selectStockSettingsIsLoading);
  const settingsErrorMessage = useStockSettingsStore(
    selectStockSettingsErrorMessage,
  );
  const wizardErrorMessage = useStockWizardStore(selectStockWizardErrorMessage);

  const totalInstances = locations.reduce(
    (sum, { stockCount }) => sum + stockCount,
    0,
  );
  const errorMessage = settingsErrorMessage ?? wizardErrorMessage;
  const isInitialLoad = isLoading && locations.length === 0;

  return (
    <section className="stock-area-font stock-screen-surface mx-auto flex w-full max-w-[720px] flex-col gap-3 px-5 pb-10">
      <header className="flex items-start gap-3">
        <button
          type="button"
          className="stock-card-surface grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-[var(--stock-heading)]"
          onClick={() => homeShellActions.selectNavigationPage("settings")}
          aria-label="Back to settings"
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 pt-0.5">
          <h1 className="m-0 text-[18px] font-bold leading-tight text-[var(--stock-heading)]">
            Stock locations
          </h1>
          <p className="m-0 mt-0.5 text-[14px] text-[var(--stock-body)]">
            {pluralize(locations.length, "location")} ·{" "}
            {pluralize(totalInstances, "stock instance")}
          </p>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-[16px] border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-1 flex flex-col gap-3">
        {isInitialLoad ? (
          <>
            <div className="h-[92px] animate-pulse rounded-[24px] bg-slate-900/5" />
            <div className="h-[92px] animate-pulse rounded-[24px] bg-slate-900/5" />
          </>
        ) : null}

        {!isInitialLoad && locations.length === 0 ? (
          <div className="stock-card-surface rounded-[24px] px-5 py-6">
            <p className="m-0 text-[16px] font-bold text-[var(--stock-heading)]">
              No stock locations yet
            </p>
            <p className="m-0 mt-1 text-[14px] leading-snug text-[var(--stock-body)]">
              Pick a location below and configure its first stock instance. The
              report only counts items that match a configured instance.
            </p>
          </div>
        ) : null}

        {locations.map(({ location, stockCount }) => (
          <button
            key={location}
            type="button"
            data-testid="stock-location-row"
            className="stock-card-surface flex w-full items-center gap-4 rounded-[24px] px-4 py-4 text-left"
            onClick={() => onOpenLocation(location)}
          >
            <span className="stock-mono grid h-[52px] min-w-[52px] flex-shrink-0 place-items-center rounded-[16px] bg-[var(--stock-code-badge-bg)] px-2 text-[14px] font-medium text-[var(--stock-primary)]">
              {location}
            </span>
            <span className="min-w-0 flex-1 text-[14px] text-[var(--stock-body)]">
              {pluralize(stockCount, "stock instance")} configured
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
            <span className="text-[16px] font-bold leading-tight text-[var(--stock-muted)]">
              New location
            </span>
            <span className="mt-0.5 text-[14px] text-[var(--stock-faint)]">
              Zones without instances
            </span>
          </span>
        </button>
      </div>

      {/* Design 06 line 11: the pill offers every location, none preselected. D3's
          instance-less restriction binds only the dashed row above (plan 6 C8). */}
      <StockFloatingPill
        label="New instance"
        onPress={() =>
          void openWizard(stockActions.startNewWizardOverAllLocations())
        }
      />
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

  if (currentView === "wizard-step1") {
    return <StockWizardStep1View />;
  }

  if (currentView === "wizard-step2") {
    // A saved instance lands on its location's detail, whatever detail was open before.
    return <StockWizardStep2View onSaved={setDetailLocation} />;
  }

  return <StockLocationsRootView onOpenLocation={openLocation} />;
}
