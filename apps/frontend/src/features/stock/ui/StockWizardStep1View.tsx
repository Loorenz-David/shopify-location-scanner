import { useRef, useState } from "react";

import { ChevronRightIcon, CloseIcon, PlusIcon } from "../../../assets/icons";
import { locationBlockOf, splitLocationCode } from "../../../share/location-codes";
import { stockActions } from "../actions/stock.actions";
import { buildCriteria, displayValueFor, propertyKeyLabel } from "../domain/stock-criteria.domain";
import type { CriteriaDraftProperty } from "../domain/stock-criteria.domain";
import { groupLocationsByLetter } from "../domain/stock-location-groups.domain";
import { restrictLocationsToBlock } from "../domain/stock-location-restriction.domain";
import {
  selectStockWizardAvailableLocations,
  selectStockWizardDraft,
  selectStockWizardError,
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
import { StockCategoryThumbnail } from "./StockCategoryThumbnail";
import { StockSelectSheet } from "./StockSelectSheet";

const EMPTY_OPTIONS: StockOptionsDto = { itemCategories: [], propertyOptions: [] };
const ANY_VALUE_ID = "__any_value__";

// Every list on this screen is one bottom sheet. `values` is reached either from the
// definition list (a drill-down that goes back to it) or straight from a property row.
type SheetState =
  | { kind: "location" }
  | { kind: "location-letter"; letter: string }
  | { kind: "definition" }
  | { kind: "actions" }
  | {
      kind: "values";
      key: string;
      selectedValues: string[];
      anyValue: boolean;
      isExisting: boolean;
      fromDefinitionList: boolean;
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
      // The API may return wire-cased values (for example `up`), whereas the picker
      // exposes display-cased values (`Up`). Normalize and de-duplicate them here so
      // an edited selection is visibly checked and cannot be added a second time.
      const values = Array.isArray(value) ? value : [value];
      const selectedValues = [...new Map(
        values.map((item) => [item.toLowerCase(), displayValueFor(key, item, options)]),
      ).values()];
      return { key, selectedValues };
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
  const error = useStockWizardStore(selectStockWizardError);
  const isEditing = useStockWizardStore(selectStockWizardIsEditing);
  const editingId = useStockWizardStore((state) => state.editingId);
  const isSubmitting = useStockWizardStore((state) => state.isSubmitting);
  const availableLocations = useStockWizardStore(selectStockWizardAvailableLocations);
  const originalLocation = useStockWizardStore((state) => state.originalLocation);
  const options = useStockWizardStore(selectStockWizardOptions) ?? EMPTY_OPTIONS;
  // `sheet` holds the content and outlives `isSheetOpen`, so the panel keeps rendering
  // what the user was looking at while it slides out instead of blanking.
  const [sheet, setSheet] = useState<SheetState>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // null = not typing, so the input shows the committed item type.
  const [categoryQuery, setCategoryQuery] = useState<string | null>(null);
  const [isCategoryListOpen, setIsCategoryListOpen] = useState(false);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  if (draft === null) {
    return null;
  }

  // The store keeps every location the entry point allowed; the picker offers the
  // restricted set (see stock-location-restriction.domain — temporary).
  const { locations: offeredLocations, directBlock } =
    restrictLocationsToBlock(availableLocations);

  const rows = rowsFrom(draft.properties, options);
  const definitions = draft.itemCategory === "" ? [] : definitionsFor(options, draft.itemCategory);
  const unusedDefinitions = definitions.filter(
    (definition) => !rows.some((row) => row.key === definition.key),
  );
  const canContinue = draft.location !== "" && draft.itemCategory !== "";

  // While the field is untouched it shows the committed type and offers every option;
  // once the user types, the list narrows to substring matches on what they typed.
  const categoryText = categoryQuery ?? draft.itemCategory;
  const categoryFilter = (categoryQuery ?? "").trim().toLowerCase();
  const categoryMatches =
    categoryFilter === ""
      ? options.itemCategories
      : options.itemCategories.filter((category) =>
          category.toLowerCase().includes(categoryFilter),
        );

  const commitRows = (nextRows: readonly CriteriaDraftProperty[]) => {
    stockActions.updateWizardDraft({ properties: buildCriteria({ properties: nextRows }) });
  };

  const chooseCategory = (category: string) => {
    // Keys bound to the previous category would be phantom keys under the new one (M4);
    // they are dropped rather than submitted for a 400. Deselecting (category "") keeps the
    // rows: typing over the input is how a selection is edited, and every keystroke that
    // breaks the match would otherwise silently bin work the user can still get back to.
    const keptRows =
      category === ""
        ? rows
        : rows.filter((row) =>
            definitionsFor(options, category).some((option) => option.key === row.key),
          );
    stockActions.updateWizardDraft({
      itemCategory: category,
      properties:
        keptRows.length === rows.length
          ? draft.properties
          : buildCriteria({ properties: keptRows }),
    });
  };

  // A typed item type counts as chosen only on an exact (case-insensitive) hit; anything
  // else leaves nothing selected, so Next stays gated.
  const editCategoryQuery = (text: string) => {
    setCategoryQuery(text);
    setIsCategoryListOpen(true);
    const exact = options.itemCategories.find(
      (category) => category.toLowerCase() === text.trim().toLowerCase(),
    );
    if (exact !== undefined) {
      chooseCategory(exact);
      return;
    }
    if (draft.itemCategory !== "") {
      chooseCategory("");
    }
  };

  const selectCategory = (category: string) => {
    chooseCategory(category);
    setCategoryQuery(null);
    setIsCategoryListOpen(false);
  };

  const clearCategory = () => {
    chooseCategory("");
    setCategoryQuery(null);
    setIsCategoryListOpen(true);
    categoryInputRef.current?.focus();
  };

  const openSheet = (next: NonNullable<SheetState>) => {
    setSheet(next);
    setIsSheetOpen(true);
  };

  const openValuesFor = (key: string, fromDefinitionList: boolean) => {
    const existing = rows.find((row) => row.key === key);
    openSheet({
      kind: "values",
      key,
      selectedValues: existing ? [...existing.selectedValues] : [],
      anyValue: existing?.anyValue ?? false,
      isExisting: existing !== undefined,
      fromDefinitionList,
    });
  };

  const toggleValue = (id: string) => {
    setSheet((current) => {
      if (current?.kind !== "values") {
        return current;
      }
      if (id === ANY_VALUE_ID) {
        return { ...current, anyValue: !current.anyValue, selectedValues: [] };
      }
      const isSelected = current.selectedValues.some(
        (value) => value.toLowerCase() === id.toLowerCase(),
      );
      const selectedValues = isSelected
        ? current.selectedValues.filter((value) => value.toLowerCase() !== id.toLowerCase())
        : [...current.selectedValues, id];
      return { ...current, anyValue: false, selectedValues };
    });
  };

  const commitValues = () => {
    if (sheet?.kind !== "values") {
      return;
    }
    const nextRow: CriteriaDraftProperty = {
      key: sheet.key,
      selectedValues: sheet.selectedValues,
      anyValue: sheet.anyValue,
    };
    commitRows(
      sheet.isExisting
        ? rows.map((row) => (row.key === sheet.key ? nextRow : row))
        : [...rows, nextRow],
    );
    setIsSheetOpen(false);
  };

  const deleteInstance = async () => {
    if (editingId === null || isSubmitting) {
      return;
    }

    try {
      await stockActions.deleteConfiguration(editingId, originalLocation ?? draft.location);
      stockActions.discardWizard();
      stockActions.popView();
    } catch {
      // The controller has stored a user-facing error; close the action sheet so it is visible.
      setIsSheetOpen(false);
    }
  };

  const sheetView = sheet;
  const valuesDefinition =
    sheetView?.kind === "values"
      ? options.propertyOptions.find((option) => option.key === sheetView.key)
      : undefined;

  const sheetProps = (() => {
    if (sheetView?.kind === "actions") {
      return {
        title: "Instance actions",
        eyebrow: "Stock instance",
        emptyMessage: "No actions available.",
        monoLabels: false,
        options: [{
          id: "delete",
          label: "Delete stock instance",
          isSelected: false,
          isDestructive: true,
          isDisabled: isSubmitting,
        }],
        onSelect: () => void deleteInstance(),
      };
    }

    if (sheetView?.kind === "definition") {
      return {
        title: "Add property",
        eyebrow: `for ${draft.itemCategory}`,
        emptyMessage: "Every property for this item type is already in use.",
        monoLabels: true,
        options: unusedDefinitions.map((definition) => ({
          // `id` stays the wire key — it is what onSelect feeds back into the
          // draft. Only the label is the user-facing name.
          id: definition.key,
          label: propertyKeyLabel(definition.key),
          isSelected: false,
        })),
        onSelect: (key: string) => openValuesFor(key, true),
      };
    }

    if (sheetView?.kind === "values") {
      return {
        title: propertyKeyLabel(sheetView.key),
        eyebrow: sheetView.isExisting ? "change values" : "choose values",
        emptyMessage: "This property has no values in the vocabulary.",
        monoLabels: false,
        options: [
          {
            id: ANY_VALUE_ID,
            label: "Any value",
            isSelected: sheetView.anyValue,
            isWildcard: true,
          },
          ...(valuesDefinition?.values ?? []).map((value) => ({
            id: value,
            label: value,
            isSelected: sheetView.selectedValues.includes(value),
          })),
        ],
        onSelect: toggleValue,
        // Reached from the definition list, ‹ returns to it; opened from a row, it dismisses.
        onBack: sheetView.fromDefinitionList
          ? () => setSheet({ kind: "definition" })
          : undefined,
        backLabel: "Back to properties",
        cta: {
          label: "Done",
          isDisabled: !sheetView.anyValue && sheetView.selectedValues.length === 0,
          onPress: commitValues,
        },
      };
    }

    const commitLocation = (location: string) => {
      stockActions.updateWizardDraft({ location });
      setIsSheetOpen(false);
    };

    const { groups, unstructured } = groupLocationsByLetter(offeredLocations);

    if (sheetView?.kind === "location-letter") {
      const group = groups.find((entry) => entry.letter === sheetView.letter);
      const locations = group?.locations ?? [];

      return {
        title: "Location",
        eyebrow: `${sheetView.letter} · ${locations.length} ${
          locations.length === 1 ? "location" : "locations"
        }`,
        emptyMessage: "No locations in this block.",
        monoLabels: true,
        layout: "grid" as const,
        options: locations.map((location) => ({
          id: location,
          // The card shows the number alone — the letter is the step you are standing in.
          label: splitLocationCode(location)?.suffix ?? location,
          accessibleLabel: location,
          isSelected: location === draft.location,
        })),
        onSelect: commitLocation,
        // Entered directly on a block, there is no letter step to go back to, so the
        // sheet keeps its × dismiss.
        onBack:
          directBlock === null ? () => setSheet({ kind: "location" }) : undefined,
        backLabel: "Back to location blocks",
      };
    }

    return {
      title: "Location",
      eyebrow: `${offeredLocations.length} available`,
      emptyMessage: "Every location already has stock instances.",
      monoLabels: true,
      layout: "grid" as const,
      // Letter blocks first, then any code that does not split into letter + number —
      // those are offered whole rather than hidden behind a block that cannot exist.
      options: [
        ...groups.map((group) => ({
          id: `letter:${group.letter}`,
          label: group.letter,
          accessibleLabel: group.letter,
          caption: `${group.locations.length}`,
          isSelected: locationBlockOf(draft.location) === group.letter,
        })),
        ...unstructured.map((location) => ({
          id: `location:${location}`,
          label: location,
          accessibleLabel: location,
          isSelected: location === draft.location,
        })),
      ],
      onSelect: (id: string) => {
        if (id.startsWith("letter:")) {
          setSheet({ kind: "location-letter", letter: id.slice("letter:".length) });
          return;
        }
        commitLocation(id.slice("location:".length));
      },
    };
  })();


  const stepEyebrow =
    originalLocation === null ? "Step 1 of 2" : `Step 1 of 2 · from ${originalLocation}`;
  const propertiesHelper =
    draft.itemCategory === "" || draft.location === ""
      ? "Leave empty to apply these thresholds to every item of this type in the location."
      : `Leave empty to apply these thresholds to every ${draft.itemCategory} item in ${draft.location}.`;

  return (
    <section className="stock-area-font stock-screen-surface mx-auto flex w-full max-w-[720px] flex-col gap-4 px-5 pb-28">
      <div className="flex items-start gap-3">
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
        {isEditing ? (
          <button
            type="button"
            aria-label="More actions"
            className="ml-auto grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-[var(--stock-heading)]"
            onClick={() => openSheet({ kind: "actions" })}
          >
            <span className="flex flex-col gap-[3px]" aria-hidden="true">
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="h-1 w-1 rounded-full bg-current" />
            </span>
          </button>
        ) : null}
      </div>
      <StockWizardProgress step={1} />

      {error ? (
        <div
          data-testid="stock-wizard-error"
          role="alert"
          className="rounded-[16px] border border-rose-300 bg-rose-100 px-4 py-3 text-[14px] font-semibold text-rose-900"
        >
          {error.message}
        </div>
      ) : null}

      <div className="mt-1 flex flex-col gap-3">
        <StockWizardSectionLabel number={1} label="Location" />
        <button
          type="button"
          aria-label="Location"
          data-testid="stock-wizard-location-select"
          className="stock-card-surface flex min-h-[64px] w-full items-center justify-between gap-3 rounded-[24px] px-5 text-left disabled:opacity-60"
          disabled={offeredLocations.length === 0}
          // Restricted to one block, the letter step holds a single card and would only
          // stand between the user and the number they came for.
          onClick={() =>
            openSheet(
              directBlock === null
                ? { kind: "location" }
                : { kind: "location-letter", letter: directBlock },
            )
          }
        >
          <span
            className={
              draft.location === ""
                ? "text-[14px] font-semibold leading-tight text-[var(--stock-muted)]"
                : "stock-mono text-[15px] font-medium leading-tight text-[var(--stock-heading)]"
            }
          >
            {draft.location === "" ? "Choose a location" : draft.location}
          </span>
          <ChevronRightIcon
            className="h-5 w-5 flex-shrink-0 rotate-90 text-[var(--stock-muted)]"
            aria-hidden="true"
          />
        </button>
        {offeredLocations.length === 0 ? (
          <div className="rounded-[24px] border-2 border-dashed border-[var(--stock-dashed)] px-5 py-6 text-center text-[14px] text-[var(--stock-muted)]">
            Every location already has stock instances. Use the floating button on the
            locations screen to add another one.
          </div>
        ) : (
          <p className="m-0 text-[12px] text-[var(--stock-muted)]">
            {offeredLocations.length}{" "}
            {offeredLocations.length === 1 ? "location" : "locations"} available
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-3">
        <StockWizardSectionLabel number={2} label="Item type" />
        <div className="relative">
          <div className="stock-card-surface flex min-h-[64px] w-full items-center gap-2 rounded-[24px] px-5">
            <input
              ref={categoryInputRef}
              type="text"
              role="combobox"
              aria-label="Item type"
              aria-expanded={isCategoryListOpen}
              aria-autocomplete="list"
              aria-controls="stock-wizard-category-list"
              data-testid="stock-wizard-category-input"
              className="min-w-0 flex-1 bg-transparent py-4 text-[14px] font-semibold leading-tight text-[var(--stock-heading)] outline-none placeholder:font-semibold placeholder:text-[var(--stock-muted)]"
              placeholder="Search item types"
              value={categoryText}
              onChange={(event) => editCategoryQuery(event.target.value)}
              onFocus={() => setIsCategoryListOpen(true)}
              // Committing on blur would accept a half-typed name; the input snaps back to
              // whatever is actually selected instead.
              onBlur={() => {
                setIsCategoryListOpen(false);
                setCategoryQuery(null);
              }}
            />
            {categoryText === "" ? null : (
              <button
                type="button"
                aria-label="Clear item type"
                className="grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-full bg-[var(--stock-track)] text-[var(--stock-body)]"
                // Without this the input blurs first and the click lands on nothing.
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearCategory}
              >
                <CloseIcon className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>

          {isCategoryListOpen && categoryMatches.length > 0 ? (
            <div
              id="stock-wizard-category-list"
              role="listbox"
              aria-label="Item type"
              className="stock-card-surface absolute inset-x-0 top-[calc(100%+8px)] z-40 flex max-h-[280px] flex-col overflow-y-auto rounded-[24px] bg-white px-5 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
            >
              {categoryMatches.map((category, index) => (
                <button
                  key={category}
                  type="button"
                  role="option"
                  aria-selected={category === draft.itemCategory}
                  data-testid="stock-wizard-category-option"
                  className={`flex min-h-[56px] items-center gap-3 py-2.5 text-left text-[14px] font-medium leading-tight ${
                    index < categoryMatches.length - 1
                      ? "border-b border-[var(--stock-hairline)]"
                      : ""
                  } ${
                    category === draft.itemCategory
                      ? "text-[var(--stock-primary)]"
                      : "text-[var(--stock-heading)]"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCategory(category)}
                >
                  <StockCategoryThumbnail itemCategory={category} size={34} />
                  <span className="min-w-0 flex-1">{category}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className="m-0 text-[12px] text-[var(--stock-muted)]">
          {categoryMatches.length === options.itemCategories.length
            ? `${options.itemCategories.length} item types available`
            : `${categoryMatches.length} of ${options.itemCategories.length} item types match`}
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-3">
        <StockWizardSectionLabel number={3} label="Properties" note="optional" />
        {rows.length > 0 ? (
          <div className="stock-card-surface flex flex-col rounded-[24px] px-5">
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
                  onClick={() => openValuesFor(row.key, false)}
                >
                  <span className="stock-mono text-[10px] uppercase tracking-[0.14em] text-[var(--stock-muted)]">
                    {propertyKeyLabel(row.key)}
                  </span>
                  <span
                    className={`mt-1 text-[14px] font-semibold leading-tight text-[var(--stock-heading)] ${
                      row.anyValue ? "italic" : ""
                    }`}
                  >
                    {rowValueLabel(row, options)}
                  </span>
                </button>
                <button
                  type="button"
                  className="grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-full bg-[var(--stock-track)] text-[var(--stock-body)]"
                  aria-label={`Remove ${propertyKeyLabel(row.key)}`}
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
          className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-[var(--stock-dashed)] text-[14px] font-semibold text-[var(--stock-primary)] disabled:text-[var(--stock-muted)]"
          disabled={draft.itemCategory === ""}
          onClick={() => openSheet({ kind: "definition" })}
        >
          <PlusIcon className="h-5 w-5" aria-hidden="true" />
          <span>Add property</span>
        </button>
        <p className="m-0 text-[12px] leading-snug text-[var(--stock-body)]">
          {draft.itemCategory === ""
            ? "Choose an item type first. Leaving properties empty applies the thresholds to every item of that type in the location."
            : propertiesHelper}
        </p>
      </div>

      <StockSelectSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        {...sheetProps}
      />

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
