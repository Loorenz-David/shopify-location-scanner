import { useState } from "react";

import { ChevronRightIcon, CloseIcon, PlusIcon } from "../../../assets/icons";
import { stockActions } from "../actions/stock.actions";
import { buildCriteria, displayValueFor } from "../domain/stock-criteria.domain";
import type { CriteriaDraftProperty } from "../domain/stock-criteria.domain";
import {
  selectStockWizardAvailableLocations,
  selectStockWizardDraft,
  selectStockWizardIsEditing,
  selectStockWizardOptions,
  useStockWizardStore,
} from "../stores/stock-wizard.store";
import type {
  StockOptionsDto,
  StockPropertiesDto,
  StockPropertyOptionDto,
} from "../types/stock.dto";
import {
  primaryCtaClassName,
  StockWizardFooter,
  StockWizardHeader,
  StockWizardProgress,
  StockWizardSectionLabel,
} from "./StockWizardChrome";
import { StockWizardPicker } from "./StockWizardPicker";

const EMPTY_OPTIONS: StockOptionsDto = { itemCategories: [], propertyOptions: [] };
const ANY_VALUE_ID = "__any_value__";

type PickerState =
  | { kind: "category" }
  | { kind: "definition" }
  | {
      kind: "values";
      key: string;
      selectedValues: string[];
      anyValue: boolean;
      isExisting: boolean;
    }
  | null;

// A definition applies to a category when it is universal or lists that category (S4a:
// 19 of 28 categories bind nothing beyond the four universal keys).
function definitionsFor(
  options: StockOptionsDto,
  category: string,
): StockPropertyOptionDto[] {
  return options.propertyOptions.filter(
    (option) => option.categories === "universal" || option.categories.includes(category),
  );
}

// The draft's `properties` is the request object MC6 builds; rows are its wizard-side
// reading, ordered by the GET 4.1 key order (unknown keys last, as they were stored).
function rowsFrom(properties: StockPropertiesDto, options: StockOptionsDto): CriteriaDraftProperty[] {
  const keyOrder = new Map(options.propertyOptions.map((option, index) => [option.key, index]));

  return Object.entries(properties)
    .toSorted(
      ([left], [right]) =>
        (keyOrder.get(left) ?? Number.POSITIVE_INFINITY) -
        (keyOrder.get(right) ?? Number.POSITIVE_INFINITY),
    )
    .map(([key, value]) => {
      if (value === null) {
        return { key, selectedValues: [], anyValue: true };
      }
      return { key, selectedValues: Array.isArray(value) ? value : [value] };
    });
}

function rowValueLabel(row: CriteriaDraftProperty, options: StockOptionsDto): string {
  if (row.anyValue) {
    return "Any value";
  }
  return row.selectedValues
    .map((value) => displayValueFor(row.key, value, options))
    .join(", ");
}

export function StockWizardStep1View() {
  const draft = useStockWizardStore(selectStockWizardDraft);
  const isEditing = useStockWizardStore(selectStockWizardIsEditing);
  const availableLocations = useStockWizardStore(selectStockWizardAvailableLocations);
  const originalLocation = useStockWizardStore((state) => state.originalLocation);
  const options = useStockWizardStore(selectStockWizardOptions) ?? EMPTY_OPTIONS;
  const [picker, setPicker] = useState<PickerState>(null);

  if (draft === null) {
    return null;
  }

  const rows = rowsFrom(draft.properties, options);
  const definitions = draft.itemCategory === "" ? [] : definitionsFor(options, draft.itemCategory);
  const unusedDefinitions = definitions.filter(
    (definition) => !rows.some((row) => row.key === definition.key),
  );
  const canContinue = draft.location !== "" && draft.itemCategory !== "";

  const commitRows = (nextRows: readonly CriteriaDraftProperty[]) => {
    stockActions.updateWizardDraft({ properties: buildCriteria({ properties: nextRows }) });
  };

  const chooseCategory = (category: string) => {
    // Keys bound to the previous category would be phantom keys under the new one (M4);
    // they are dropped rather than submitted for a 400.
    const validKeys = new Set(definitionsFor(options, category).map((option) => option.key));
    const keptRows = rows.filter((row) => validKeys.has(row.key));
    stockActions.updateWizardDraft({
      itemCategory: category,
      properties:
        keptRows.length === rows.length
          ? draft.properties
          : buildCriteria({ properties: keptRows }),
    });
    setPicker(null);
  };

  const openValuesFor = (key: string) => {
    const existing = rows.find((row) => row.key === key);
    setPicker({
      kind: "values",
      key,
      selectedValues: existing ? [...existing.selectedValues] : [],
      anyValue: existing?.anyValue ?? false,
      isExisting: existing !== undefined,
    });
  };

  if (picker?.kind === "category") {
    return (
      <StockWizardPicker
        title="Item type"
        eyebrow={`${options.itemCategories.length} item types`}
        emptyMessage="No item types are available."
        options={options.itemCategories.map((category) => ({
          id: category,
          label: category,
          isSelected: category === draft.itemCategory,
        }))}
        onSelect={chooseCategory}
        onBack={() => setPicker(null)}
      />
    );
  }

  if (picker?.kind === "definition") {
    return (
      <StockWizardPicker
        title="Add property"
        eyebrow={`for ${draft.itemCategory}`}
        emptyMessage="Every property for this item type is already in use."
        options={unusedDefinitions.map((definition) => ({
          id: definition.key,
          label: definition.key,
          isSelected: false,
        }))}
        onSelect={openValuesFor}
        onBack={() => setPicker(null)}
      />
    );
  }

  if (picker?.kind === "values") {
    const definition = options.propertyOptions.find((option) => option.key === picker.key);
    const values = definition?.values ?? [];
    const toggle = (id: string) => {
      if (id === ANY_VALUE_ID) {
        setPicker({ ...picker, anyValue: !picker.anyValue, selectedValues: [] });
        return;
      }
      const selectedValues = picker.selectedValues.includes(id)
        ? picker.selectedValues.filter((value) => value !== id)
        : [...picker.selectedValues, id];
      setPicker({ ...picker, anyValue: false, selectedValues });
    };
    const done = () => {
      const nextRow: CriteriaDraftProperty = {
        key: picker.key,
        selectedValues: picker.selectedValues,
        anyValue: picker.anyValue,
      };
      commitRows(
        picker.isExisting
          ? rows.map((row) => (row.key === picker.key ? nextRow : row))
          : [...rows, nextRow],
      );
      setPicker(null);
    };

    return (
      <StockWizardPicker
        title={picker.key}
        eyebrow={picker.isExisting ? "change values" : "choose values"}
        emptyMessage="This property has no values in the vocabulary."
        options={[
          {
            id: ANY_VALUE_ID,
            label: "Any value",
            isSelected: picker.anyValue,
            isWildcard: true,
          },
          ...values.map((value) => ({
            id: value,
            label: value,
            isSelected: picker.selectedValues.includes(value),
          })),
        ]}
        onSelect={toggle}
        onBack={() => setPicker(null)}
        cta={{
          label: "Done",
          isDisabled: !picker.anyValue && picker.selectedValues.length === 0,
          onPress: done,
        }}
      />
    );
  }

  const stepEyebrow =
    originalLocation === null ? "Step 1 of 2" : `Step 1 of 2 · from ${originalLocation}`;
  const propertiesHelper =
    draft.itemCategory === "" || draft.location === ""
      ? "Leave empty to apply these thresholds to every item of this type in the location."
      : `Leave empty to apply these thresholds to every ${draft.itemCategory} item in ${draft.location}.`;

  return (
    <section className="stock-area-font mx-auto flex w-full max-w-[720px] flex-col gap-4 px-5 pb-28">
      <StockWizardHeader
        title={isEditing ? "Edit stock instance" : "New stock instance"}
        eyebrow={stepEyebrow}
        eyebrowTestId="stock-wizard-step-eyebrow"
        dismiss="discard"
        dismissLabel="Discard"
        onDismiss={() => {
          // Discarding must clear the wizard store, not just pop the view: screens 06/07
          // render `settingsErrorMessage ?? wizardErrorMessage`, so a 409 banner left
          // behind here follows the user back onto the location screen and stays there
          // until the next wizard start. Unreachable against mocks, routine against a
          // real backend, where a duplicate definition is the first thing anyone hits.
          stockActions.discardWizard();
          stockActions.popView();
        }}
      />
      <StockWizardProgress step={1} />

      <div className="mt-1 flex flex-col gap-3">
        <StockWizardSectionLabel number={1} label="Location" />
        <div className="grid grid-cols-3 gap-3">
          {availableLocations.map((location) => {
            const isSelected = location === draft.location;
            return (
              <button
                key={location}
                type="button"
                data-testid="stock-wizard-location-card"
                aria-pressed={isSelected}
                className={`stock-mono flex min-h-[72px] items-center justify-center rounded-[20px] px-3 text-[19px] font-medium transition ${
                  isSelected
                    ? "bg-[var(--stock-primary)] text-white shadow-[var(--stock-cta-shadow)]"
                    : "bg-[var(--stock-surface)] text-[var(--stock-heading)] shadow-[var(--stock-card-shadow)]"
                }`}
                onClick={() => stockActions.updateWizardDraft({ location })}
              >
                {location}
              </button>
            );
          })}
        </div>
        {availableLocations.length === 0 ? (
          <div className="rounded-[24px] border-2 border-dashed border-[var(--stock-dashed)] px-5 py-6 text-center text-[15px] text-[var(--stock-muted)]">
            Every location already has stock instances. Use the floating button on the
            locations screen to add another one.
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-col gap-3">
        <StockWizardSectionLabel number={2} label="Item type" />
        <button
          type="button"
          aria-label="Item type"
          className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-[24px] bg-[var(--stock-surface)] px-5 text-left shadow-[var(--stock-card-shadow)]"
          onClick={() => setPicker({ kind: "category" })}
        >
          <span
            className={`text-[17px] font-semibold leading-tight ${
              draft.itemCategory === "" ? "text-[var(--stock-muted)]" : "text-[var(--stock-heading)]"
            }`}
          >
            {draft.itemCategory === "" ? "Choose an item type" : draft.itemCategory}
          </span>
          <ChevronRightIcon
            className="h-5 w-5 flex-shrink-0 rotate-90 text-[var(--stock-muted)]"
            aria-hidden="true"
          />
        </button>
        <p className="m-0 text-[13px] text-[var(--stock-muted)]">
          {options.itemCategories.length} item types available
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-3">
        <StockWizardSectionLabel number={3} label="Properties" note="optional" />
        {rows.length > 0 ? (
          <div className="flex flex-col rounded-[24px] bg-[var(--stock-surface)] px-5 shadow-[var(--stock-card-shadow)]">
            {rows.map((row, index) => (
              <div
                key={row.key}
                data-testid="stock-wizard-property-row"
                className={`flex items-center justify-between gap-3 py-3.5 ${
                  index < rows.length - 1 ? "border-b border-[var(--stock-hairline)]" : ""
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col text-left"
                  onClick={() => openValuesFor(row.key)}
                >
                  <span className="stock-mono text-[11px] uppercase tracking-[0.14em] text-[var(--stock-muted)]">
                    {row.key}
                  </span>
                  <span
                    className={`mt-1 text-[15px] font-semibold leading-tight text-[var(--stock-heading)] ${
                      row.anyValue ? "italic" : ""
                    }`}
                  >
                    {rowValueLabel(row, options)}
                  </span>
                </button>
                <button
                  type="button"
                  className="grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-full bg-[var(--stock-track)] text-[var(--stock-body)]"
                  aria-label={`Remove ${row.key}`}
                  onClick={() => commitRows(rows.filter((candidate) => candidate.key !== row.key))}
                >
                  <CloseIcon className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-[var(--stock-dashed)] text-[15px] font-semibold text-[var(--stock-primary)] disabled:text-[var(--stock-muted)]"
          disabled={draft.itemCategory === ""}
          onClick={() => setPicker({ kind: "definition" })}
        >
          <PlusIcon className="h-5 w-5" aria-hidden="true" />
          <span>Add property</span>
        </button>
        <p className="m-0 text-[13px] leading-snug text-[var(--stock-body)]">
          {draft.itemCategory === ""
            ? "Choose an item type first. Leaving properties empty applies the thresholds to every item of that type in the location."
            : propertiesHelper}
        </p>
      </div>

      <StockWizardFooter>
        <button
          type="button"
          className={primaryCtaClassName}
          disabled={!canContinue}
          onClick={() => {
            stockActions.setWizardStep(2);
            stockActions.pushView("wizard-step2");
          }}
        >
          Next · thresholds
        </button>
      </StockWizardFooter>
    </section>
  );
}
