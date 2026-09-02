import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { stockActions } from "../actions/stock.actions";
import { buildPdfModel, pdfFilename } from "../domain/stock-pdf.domain";
import { getStockStateMeta, STOCK_STATES } from "../domain/stock-states.domain";
import {
  selectStockReportEntries,
  selectStockReportExportPageCount,
  selectStockReportExportQuery,
  selectStockReportOptions,
  useStockReportStore,
} from "../stores/stock-report.store";
import type { StockPdfRenderHandle } from "../controllers/stock-report.controller";
import type { StockPdfExportQuery, StockPdfModel } from "../domain/stock-pdf.domain";
import type { StockOptionsDto } from "../types/stock.dto";
import { readStockPdfPageCount } from "./pdf/stock-pdf-page-count";
import { useStockPdfRenderHandle } from "./pdf/use-stock-pdf-render";

interface GeneratePdfSheetProps {
  onClose: () => void;
}

const EMPTY_OPTIONS: StockOptionsDto = { itemCategories: [], propertyOptions: [] };

const eyebrowClassName =
  "stock-mono m-0 text-[10px] uppercase tracking-[0.14em] text-[var(--stock-muted)]";

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[20px] bg-[var(--stock-track)] px-4 py-3.5">
      <span className="text-[14px] font-semibold text-[var(--stock-heading)]">{label}</span>
      <span className="inline-flex items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
          aria-label={label}
        />
        <span
          className={`relative h-8 w-[60px] rounded-full transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--stock-primary)] ${
            checked ? "bg-[var(--stock-primary)]" : "bg-[#C9D3CE]"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
              checked ? "left-[32px]" : "left-1"
            }`}
          />
        </span>
      </span>
    </label>
  );
}

// Miniature first page: brand bar over a few state-tinted lines (design 05).
function PreviewMiniature() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[124px] w-[92px] flex-shrink-0 flex-col gap-1.5 rounded-[12px] border border-[var(--stock-hairline)] bg-white p-3 shadow-[var(--stock-card-shadow)]"
    >
      <span className="mb-1 h-1.5 w-8 rounded-full bg-[var(--stock-primary)]" />
      {STOCK_STATES.map((state) => (
        <span
          key={state}
          className="h-1.5 w-full rounded-full"
          style={{ backgroundColor: getStockStateMeta(state).tint }}
        />
      ))}
    </div>
  );
}

function isRenderReady(renderHandle: StockPdfRenderHandle): boolean {
  return !renderHandle.loading && renderHandle.blob !== null && renderHandle.error === null;
}

// Screen 05: bottom sheet over the report. It renders P8's model through the render
// hook, reads the page count back from the rendered blob (MC10), and hands the handle
// to P8's delivery actions. Both actions stay disabled until a blob exists (C7:
// `blobFromRenderHandle` throws while loading) and Share is called synchronously inside
// the tap handler (C8: iOS refuses a share detached from the gesture).
export function GeneratePdfSheet({ onClose }: GeneratePdfSheetProps) {
  const entries = useStockReportStore(selectStockReportEntries);
  const storeOptions = useStockReportStore(selectStockReportOptions);
  const query = useStockReportStore(selectStockReportExportQuery);
  const pageCount = useStockReportStore(selectStockReportExportPageCount);
  const [generatedAt] = useState(() => new Date());

  const options = storeOptions ?? EMPTY_OPTIONS;
  const filename = pdfFilename(generatedAt);
  const model = useMemo(
    () => (query === null ? null : buildPdfModel(entries, query)),
    [entries, query],
  );

  if (model === null) {
    return null;
  }

  return (
    <GeneratePdfSheetBody
      model={model}
      options={options}
      filename={filename}
      generatedAt={generatedAt}
      pageCount={pageCount}
      query={query!}
      onClose={onClose}
    />
  );
}

interface GeneratePdfSheetBodyProps {
  model: StockPdfModel;
  options: StockOptionsDto;
  filename: string;
  generatedAt: Date;
  pageCount: number | null;
  query: StockPdfExportQuery;
  onClose: () => void;
}

function GeneratePdfSheetBody({
  model,
  options,
  filename,
  generatedAt,
  pageCount,
  query,
  onClose,
}: GeneratePdfSheetBodyProps) {
  const renderHandle = useStockPdfRenderHandle({ model, options, filename, generatedAt });
  const isReady = isRenderReady(renderHandle);
  const { blob, loading, error } = renderHandle;

  // Page count is read from the rendered document, never computed (MC10). While a
  // re-render is in flight the count is unknown, and the subtitle says so.
  useEffect(() => {
    if (loading || blob === null) {
      stockActions.setPdfPageCount(null);
      return;
    }

    let isCurrent = true;
    void blob.arrayBuffer().then((bytes) => {
      if (isCurrent) {
        stockActions.setPdfPageCount(readStockPdfPageCount(bytes));
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [blob, loading]);

  const subtitle = pageCount === null
    ? "A4 · sections per state"
    : `A4 · ${pageCount} ${pageCount === 1 ? "page" : "pages"} · sections per state`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Generate PDF"
      className="stock-area-font fixed inset-0 z-50 flex flex-col justify-end"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        style={{ backgroundColor: "rgba(22,38,32,0.42)" }}
        onClick={onClose}
      />

      <section className="relative mx-auto flex max-h-[92svh] w-full max-w-[720px] flex-col rounded-t-[34px] bg-[var(--stock-surface)] shadow-[0_-20px_50px_rgba(20,40,32,0.2)]">
        <div className="flex justify-center pb-2 pt-3" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-[var(--stock-hairline)]" />
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-8 pt-2">
          <header className="flex items-center gap-4 border-b border-[var(--stock-hairline)] pb-5">
            <PreviewMiniature />
            <div className="min-w-0">
              <h2 className="m-0 text-[20px] font-bold text-[var(--stock-heading)]">
                Generate PDF
              </h2>
              <p
                data-testid="stock-pdf-subtitle"
                className="m-0 mt-1 text-[14px] text-[var(--stock-body)]"
              >
                {subtitle}
              </p>
              <p className="stock-mono m-0 mt-1.5 truncate text-[12px] text-[var(--stock-muted)]">
                {filename}
              </p>
            </div>
          </header>

          <div className="flex flex-col gap-2.5">
            <ToggleRow
              label="Include summary counts"
              checked={query.includeSummaryCounts}
              onChange={(checked) => stockActions.setPdfExportQuery({ includeSummaryCounts: checked })}
            />
            <ToggleRow
              label="Show contributing locations"
              checked={query.showContributingLocations}
              onChange={(checked) =>
                stockActions.setPdfExportQuery({ showContributingLocations: checked })
              }
            />
            <ToggleRow
              label="Group by location"
              checked={query.groupByLocation}
              onChange={(checked) => stockActions.setPdfExportGroupByLocation(checked)}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <p className={eyebrowClassName}>States in the export</p>
            <div className="flex flex-wrap gap-2">
              {STOCK_STATES.map((state) => {
                const meta = getStockStateMeta(state);
                const isIncluded = query.states.has(state);
                return (
                  <button
                    key={state}
                    type="button"
                    data-testid="stock-pdf-state-chip"
                    data-state={state}
                    aria-pressed={isIncluded}
                    className={`rounded-[14px] px-4 py-2.5 text-[13px] font-semibold ${
                      isIncluded ? "" : "bg-[#F1F4F3] text-[var(--stock-faint)]"
                    }`}
                    style={isIncluded ? { backgroundColor: meta.tint, color: meta.text } : undefined}
                    onClick={() => stockActions.togglePdfExportState(state)}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error !== null ? (
            <p className="m-0 rounded-[16px] border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">
              The PDF could not be rendered. {error}
            </p>
          ) : null}

          <div className="flex items-stretch gap-3">
            <button
              type="button"
              className="inline-flex h-14 min-w-[120px] items-center justify-center rounded-[28px] border-[1.5px] border-[#E4EAE7] bg-[var(--stock-surface)] px-6 text-[14px] font-semibold text-[var(--stock-heading)] transition active:scale-[0.98] disabled:opacity-50"
              disabled={!isReady}
              onClick={() => {
                void stockActions.previewPdf(renderHandle, generatedAt);
              }}
            >
              Preview
            </button>
            <button
              type="button"
              className="inline-flex h-14 flex-1 items-center justify-center rounded-[28px] bg-[var(--stock-primary)] px-6 text-[14px] font-semibold text-white shadow-[var(--stock-cta-shadow)] transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              disabled={!isReady}
              onClick={() => {
                // Synchronous on purpose (C8): the share must be issued inside the tap.
                void stockActions.generateAndSharePdf(renderHandle, generatedAt);
              }}
            >
              Generate & share
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
