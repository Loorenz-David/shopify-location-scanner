import { ChevronLeftIcon, ChevronRightIcon } from "../../../assets/icons";
import { stockActions } from "../actions/stock.actions";
import { renderCriteriaChips } from "../domain/stock-criteria.domain";
import { useStockSettingsFlow } from "../flows/use-stock-settings.flow";
import {
  selectStockReportOptions,
  useStockReportStore,
} from "../stores/stock-report.store";
import {
  selectStockLocationDetailsByLocation,
  selectStockSettingsErrorMessage,
  selectStockSettingsIsLoading,
  useStockSettingsStore,
} from "../stores/stock-settings.store";
import {
  selectStockWizardErrorMessage,
  selectStockWizardOptions,
  useStockWizardStore,
} from "../stores/stock-wizard.store";
import type { LocationStockDto, StockOptionsDto } from "../types/stock.dto";
import { StockFloatingPill } from "./StockFloatingPill";
import { StockPropertyChips } from "./StockPropertyChips";
import { StockThresholdStrip } from "./StockThresholdStrip";

interface StockLocationDetailViewProps {
  location: string;
}

// Chip display casing needs GET 4.1 options. No settings-side path loads them yet
// (see the P5 handoff); until a wizard or the report has fetched them, chips render
// the wire value as-is.
const EMPTY_OPTIONS: StockOptionsDto = { itemCategories: [], propertyOptions: [] };

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

interface InstanceCardProps {
  instance: LocationStockDto;
  options: StockOptionsDto;
}

function InstanceCard({ instance, options }: InstanceCardProps) {
  const chips = renderCriteriaChips(instance.properties, options);

  return (
    <article
      data-testid="stock-instance-card"
      className="rounded-[24px] bg-[var(--stock-surface)] shadow-[var(--stock-card-shadow)]"
    >
      <button
        type="button"
        className="flex w-full flex-col gap-3 px-5 pb-5 pt-4 text-left"
        onClick={() => void openWizard(stockActions.startEditWizard(instance))}
      >
        <span className="flex w-full items-center justify-between gap-3">
          <h2 className="m-0 text-[17px] font-bold leading-tight text-[var(--stock-heading)]">
            {instance.itemCategory}
          </h2>
          <ChevronRightIcon
            className="h-5 w-5 flex-shrink-0 text-[var(--stock-dashed)]"
            aria-hidden="true"
          />
        </span>
        <StockPropertyChips chips={chips} />
        <StockThresholdStrip thresholds={instance.thresholds} />
      </button>
    </article>
  );
}

export function StockLocationDetailView({ location }: StockLocationDetailViewProps) {
  useStockSettingsFlow(location);
  const detailsByLocation = useStockSettingsStore(selectStockLocationDetailsByLocation);
  const isLoading = useStockSettingsStore(selectStockSettingsIsLoading);
  const settingsErrorMessage = useStockSettingsStore(selectStockSettingsErrorMessage);
  const wizardErrorMessage = useStockWizardStore(selectStockWizardErrorMessage);
  const wizardOptions = useStockWizardStore(selectStockWizardOptions);
  const reportOptions = useStockReportStore(selectStockReportOptions);

  const instances = detailsByLocation[location];
  const options = wizardOptions ?? reportOptions ?? EMPTY_OPTIONS;
  const errorMessage = settingsErrorMessage ?? wizardErrorMessage;

  return (
    <section className="stock-area-font mx-auto flex w-full max-w-[720px] flex-col gap-3 px-5 pb-10">
      <header className="flex items-start gap-3">
        <button
          type="button"
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--stock-surface)] text-[var(--stock-heading)] shadow-[var(--stock-card-shadow)]"
          onClick={() => stockActions.popView()}
          aria-label="Back to stock locations"
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 pt-0.5">
          <h1 className="m-0 text-[21px] font-bold leading-tight text-[var(--stock-heading)]">
            {location}
          </h1>
          <p className="m-0 mt-0.5 text-[15px] text-[var(--stock-body)]">
            {pluralize(instances?.length ?? 0, "stock instance")}
          </p>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-[16px] border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      {instances === undefined && isLoading ? (
        <div className="mt-2 flex flex-col gap-3" aria-busy="true">
          <div className="h-[150px] animate-pulse rounded-[24px] bg-white/70" />
          <div className="h-[150px] animate-pulse rounded-[24px] bg-white/70" />
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          {(instances ?? []).map((instance) => (
            <InstanceCard key={instance.id} instance={instance} options={options} />
          ))}
          {instances !== undefined && instances.length === 0 ? (
            <div className="rounded-[24px] border-2 border-dashed border-[var(--stock-dashed)] px-5 py-6 text-center text-[15px] text-[var(--stock-muted)]">
              No stock instances in {location} yet.
            </div>
          ) : null}
        </div>
      )}

      <StockFloatingPill
        label={`Add instance to ${location}`}
        onPress={() =>
          void openWizard(stockActions.startNewWizardFromLocation(location))
        }
      />
    </section>
  );
}
