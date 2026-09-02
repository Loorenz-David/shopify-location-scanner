// Page count read back from the rendered document (MC10: "read from the rendered
// document", never computed from the model). pdfkit writes one page-tree root,
// `<< /Type /Pages /Count n /Kids [...] >>`, as an uncompressed object dictionary, so
// the count is readable from the bytes without a PDF parser. Only ASCII is matched, so
// a byte-preserving single-byte decode is all that is needed.
const PAGE_TREE_COUNT = /\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/;

export function readStockPdfPageCount(bytes: ArrayBuffer | Uint8Array): number | null {
  const source = new TextDecoder("latin1").decode(bytes);
  const match = PAGE_TREE_COUNT.exec(source);

  return match === null ? null : Number(match[1]);
}
