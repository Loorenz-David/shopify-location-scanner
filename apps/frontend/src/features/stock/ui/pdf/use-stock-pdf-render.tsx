import { useEffect, useMemo } from "react";
import { usePDF } from "@react-pdf/renderer";

import type { StockPdfRenderHandle } from "../../controllers/stock-report.controller";
import { StockReportPdfDocument } from "./StockReportPdf";
import type { StockReportPdfDocumentProps } from "./StockReportPdf";

// The sheet's one seam onto react-pdf: renders the document off-screen and hands back
// P8's render handle (`{ blob, loading, error, url }`). The document element is memoised
// on its inputs so a re-render of the sheet does not queue a new PDF; a real input
// change does (PDFViewer's own pattern: `usePDF()` + `updateInstance` on change).
export function useStockPdfRenderHandle(
  props: StockReportPdfDocumentProps,
): StockPdfRenderHandle {
  const { model, options, filename, generatedAt } = props;
  const document = useMemo(
    () => (
      <StockReportPdfDocument
        model={model}
        options={options}
        filename={filename}
        generatedAt={generatedAt}
      />
    ),
    [model, options, filename, generatedAt],
  );
  const [renderHandle, updateInstance] = usePDF();

  useEffect(() => {
    updateInstance(document);
  }, [document, updateInstance]);

  return renderHandle;
}
