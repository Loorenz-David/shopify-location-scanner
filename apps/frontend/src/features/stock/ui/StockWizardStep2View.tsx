import { stockActions } from "../actions/stock.actions";
import { renderCriteriaChips } from "../domain/stock-criteria.domain";
import {
  selectStockWizardDraft,
  selectStockWizardError,
  selectStockWizardIsEditing,
  selectStockWizardOptions,
  useStockWizardStore,
} from "../stores/stock-wizard.store";
import type { StockOptionsDto } from "../types/stock.dto";
import { StockPropertyChips } from "./StockPropertyChips";
import { StockThresholdLadder } from "./StockThresholdLadder";
import {
  primaryCtaClassName,
  secondaryCtaClassName,
  StockWizardFooter,
  StockWizardHeader,
  StockWizardProgress,
} from "./StockWizardChrome";

const EMPTY_OPTIONS: StockOptionsDto = {
  itemCategories: [],
  propertyOptions: [],
};

interface StockWizardStep2ViewProps {
  // The page keeps the location whose detail is shown; a saved instance lands there.
  onSaved: (location: string) => void;
}

export function StockWizardStep2View({ onSaved }: StockWizardStep2ViewProps) {
  const draft = useStockWizardStore(selectStockWizardDraft);
  const isEditing = useStockWizardStore(selectStockWizardIsEditing);
  const error = useStockWizardStore(selectStockWizardError);
  const isSubmitting = useStockWizardStore((state) => state.isSubmitting);
  const options =
    useStockWizardStore(selectStockWizardOptions) ?? EMPTY_OPTIONS;

  if (draft === null) {
    return null;
  }

  const chips = renderCriteriaChips(draft.properties, options);
  const context = [
    draft.location,
    draft.itemCategory,
    ...(chips.length > 0 ? [chips.join(", ")] : []),
  ].join(" · ");

  const goBack = () => {
    stockActions.popView();
    stockActions.setWizardStep(1);
  };

  const save = async () => {
    const location = draft.location;
    try {
      // On success the controller pops to the location detail and clears the wizard;
      // on failure it has already put the error (409 mapped by MC12b) in the store.
      await stockActions.submitWizard();
      onSaved(location);
    } catch {
      // Never retried: the form stays open with its values (C6).
    }
  };

  return (
    <section className="stock-area-font stock-screen-surface mx-auto flex w-full max-w-[720px] flex-col gap-4 px-5 pb-28">
      <StockWizardHeader
        title="Stock thresholds"
        eyebrow={context}
        eyebrowTestId="stock-wizard-context"
        dismiss="back"
        dismissLabel="Back to step 1"
        onDismiss={goBack}
      />
      <StockWizardProgress step={2} />

      {error ? (
        <div
          data-testid="stock-wizard-conflict"
          role="alert"
          className="flex flex-col gap-2 rounded-[16px] border border-rose-300 bg-rose-100 px-4 py-3 text-[14px] text-rose-900"
        >
          <p className="m-0 font-semibold">{error.message}</p>
          {error.conflicting ? (
            <div className="flex flex-col gap-1.5">
              <p className="m-0">
                Conflicts with the existing{" "}
                <strong>{error.conflicting.category}</strong> instance in{" "}
                {draft.location}:
              </p>
              <StockPropertyChips chips={error.conflicting.properties} />
            </div>
          ) : null}
        </div>
      ) : null}

      <StockThresholdLadder
        thresholds={draft.thresholds}
        onChange={(thresholds) =>
          stockActions.updateWizardDraft({ thresholds })
        }
      />

      <StockWizardFooter>
        <button
          type="button"
          className={secondaryCtaClassName}
          onClick={goBack}
        >
          Back
        </button>
        <button
          type="button"
          className={primaryCtaClassName}
          disabled={isSubmitting}
          onClick={() => void save()}
        >
          {isEditing ? "Save changes" : "Save instance"}
        </button>
      </StockWizardFooter>
    </section>
  );
}
