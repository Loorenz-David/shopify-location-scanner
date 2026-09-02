import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { criteriaChips } from "../../domain/stock-criteria.domain";
import { STOCK_PDF_COUNT_LABELS } from "../../domain/stock-pdf.domain";
import { displayedCount } from "../../domain/stock-report.domain";
import {
  getStockStateMeta,
  STOCK_STATES,
} from "../../domain/stock-states.domain";
import type {
  StockPdfModel,
  StockPdfRow,
  StockPdfSection,
  StockPdfSummaryCount,
} from "../../domain/stock-pdf.domain";
import type { StockOptionsDto } from "../../types/stock.dto";
import type { StockCountMode } from "../../types/stock.types";
import { STOCK_PDF_MONO, STOCK_PDF_SANS } from "./stock-pdf-fonts";

export interface StockReportPdfDocumentProps {
  model: StockPdfModel;
  options: StockOptionsDto;
  filename: string;
  generatedAt: Date;
}

// Chrome colours from design 00-global / 10-pdf-a4. The brand green is the scanner-FAB
// token, not the primary: the primary hex is also a state's solid and S2 keeps every
// state hex inside the states domain (owner decision, P9 round 1).
const BRAND_GREEN = "#087A50";
const HEADING = "#33404A";
const BODY = "#5C6B72";
const MUTED = "#8A9791";
const TABLE_RULE = "#DDE4E1";
const ROW_RULE = "#EFF2F1";
const SETTINGS_BG = "#FAFBFA";
const MISSING = getStockStateMeta(STOCK_STATES[0]).text;

// A section title never sits within this many points of the page bottom (design 10:
// a title is followed by its column header and at least one row on the same page).
const SECTION_MIN_PRESENCE = 72;

const COLUMN_WIDTHS = {
  withLocations: {
    type: "28%",
    properties: "32%",
    locations: "20%",
    current: "10%",
    missing: "10%",
  },
  withoutLocations: {
    type: "34%",
    properties: "46%",
    current: "10%",
    missing: "10%",
  },
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: "14mm",
    paddingBottom: "22mm",
    paddingHorizontal: "14mm",
    fontFamily: STOCK_PDF_SANS,
    fontSize: 10,
    color: BODY,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: BRAND_GREEN,
    paddingBottom: 8,
    marginBottom: 18,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 16, height: 16, borderRadius: 4, backgroundColor: BRAND_GREEN },
  brandName: { fontSize: 13, fontWeight: 700, color: HEADING },
  headerEyebrow: {
    fontFamily: STOCK_PDF_MONO,
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: MUTED,
  },
  title: { fontSize: 26, fontWeight: 700, color: HEADING, marginBottom: 2 },
  subtitle: { fontSize: 11, color: BODY, marginBottom: 16 },
  tiles: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  tileCount: { fontSize: 19, fontWeight: 700 },
  tileLabel: { fontSize: 7.5, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  sectionSquare: { width: 8, height: 8, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: HEADING },
  sectionRule: { flex: 1, height: 1, backgroundColor: TABLE_RULE },
  sectionMeta: { fontFamily: STOCK_PDF_MONO, fontSize: 8, color: MUTED },
  table: { marginBottom: 18 },
  columnHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: TABLE_RULE,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  columnLabel: {
    fontFamily: STOCK_PDF_MONO,
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: MUTED,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: ROW_RULE,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  cellType: { fontWeight: 600, color: HEADING },
  cellProperties: { color: BODY },
  propertyKey: { color: MUTED },
  propertyValue: { color: HEADING, fontWeight: 600 },
  // No italic face is registered (stock-pdf-fonts), so a wildcard is set apart by
  // colour alone: it keeps the muted key colour instead of the value's dark one.
  propertyWildcard: { color: MUTED },
  propertySeparator: { color: TABLE_RULE },
  cellLocations: { fontFamily: STOCK_PDF_MONO, fontSize: 9, color: BODY },
  cellQuantity: { fontWeight: 700, textAlign: "right" },
  settingsBox: {
    borderWidth: 1,
    borderColor: TABLE_RULE,
    borderRadius: 6,
    backgroundColor: SETTINGS_BG,
    padding: 12,
    marginTop: 4,
  },
  settingsEyebrow: {
    fontFamily: STOCK_PDF_MONO,
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 6,
  },
  settingsLine: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 4 },
  settingsKey: { color: MUTED },
  settingsValue: { color: HEADING },
  footer: {
    position: "absolute",
    left: "14mm",
    right: "14mm",
    bottom: "10mm",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: ROW_RULE,
    paddingTop: 6,
    fontFamily: STOCK_PDF_MONO,
    fontSize: 7.5,
    color: MUTED,
  },
});

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short" });
const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

// `02 Sep 2026` — en-GB's short month is "Sept" and en-US puts the day last, so the
// design's form is assembled by hand.
function shortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")} ${shortMonth.format(date)} ${date.getFullYear()}`;
}

function pluralize(count: number, noun: string, plural = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : plural}`;
}

function SummaryTiles({ counts }: { counts: readonly StockPdfSummaryCount[] }) {
  return (
    <View style={styles.tiles}>
      {counts.map((tile) => {
        const meta = getStockStateMeta(tile.state);
        return (
          <View
            key={tile.state}
            style={[styles.tile, { backgroundColor: meta.tint, borderColor: meta.solid }]}
          >
            <Text style={[styles.tileCount, { color: meta.text }]}>
              {tile.missingQuantity}
            </Text>
            <Text style={[styles.tileLabel, { color: meta.text }]}>{tile.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

interface SectionProps {
  section: StockPdfSection;
  options: StockOptionsDto;
  showContributingLocations: boolean;
  countMode: StockCountMode;
}

interface PropertiesCellProps {
  row: StockPdfRow;
  options: StockOptionsDto;
  width: string;
}

// Key then value, muted then dark, the same pairing the settings box uses: the column
// is narrow, so the criteria read as one wrapped line rather than a stack, and a bare
// `4` never sits under `Properties` next to the `Current` and `Missing` numbers.
function PropertiesCell({ row, options, width }: PropertiesCellProps) {
  const lines = criteriaChips(row.properties, options);

  return (
    <Text style={[styles.cellProperties, { width }]}>
      {lines.map((line, index) => (
        <Text key={line.key}>
          {index > 0 ? <Text style={styles.propertySeparator}>{"  ·  "}</Text> : null}
          <Text style={styles.propertyKey}>{line.label}: </Text>
          <Text style={line.isWildcard ? styles.propertyWildcard : styles.propertyValue}>
            {line.values.join(", ")}
          </Text>
        </Text>
      ))}
    </Text>
  );
}

function locationsLine(row: StockPdfRow): string {
  return row.contributions.map((contribution) => contribution.location).join(", ");
}

// The title and the table are page-level siblings on purpose: `minPresenceAhead` only
// breaks an element that has non-fixed siblings before it on the page, and a table's
// column header is `fixed` so react-pdf repeats it on every page the table spans
// (layout: fixed children survive a split into both halves). Rows are `wrap={false}`.
function Section({ section, options, showContributingLocations, countMode }: SectionProps) {
  const meta = getStockStateMeta(section.state);
  const widths = showContributingLocations
    ? COLUMN_WIDTHS.withLocations
    : COLUMN_WIDTHS.withoutLocations;
  const entriesLabel = pluralize(section.rows.length, "entry", "entries");

  return (
    <>
      <View style={styles.sectionHeader} minPresenceAhead={SECTION_MIN_PRESENCE}>
        <View style={[styles.sectionSquare, { backgroundColor: meta.solid }]} />
        <Text style={styles.sectionTitle}>{section.label}</Text>
        <View style={styles.sectionRule} />
        <Text style={styles.sectionMeta}>
          {section.isProduceFirst ? `${entriesLabel} · produce first` : entriesLabel}
        </Text>
      </View>
      <View style={styles.table}>
        <View style={styles.columnHeader} fixed>
          <Text style={[styles.columnLabel, { width: widths.type }]}>Type</Text>
          <Text style={[styles.columnLabel, { width: widths.properties }]}>Properties</Text>
          {showContributingLocations ? (
            <Text style={[styles.columnLabel, { width: COLUMN_WIDTHS.withLocations.locations }]}>
              Locations
            </Text>
          ) : null}
          <Text style={[styles.columnLabel, { width: widths.current, textAlign: "right" }]}>
            {STOCK_PDF_COUNT_LABELS[countMode]}
          </Text>
          <Text style={[styles.columnLabel, { width: widths.missing, textAlign: "right" }]}>
            {countMode === "units" ? "Missing items" : "Missing"}
          </Text>
        </View>
        {section.rows.map((row) => (
          <View key={`${row.mergeKey}|${row.locations}`} style={styles.row} wrap={false}>
            <Text style={[styles.cellType, { width: widths.type }]}>{row.itemCategory}</Text>
            <PropertiesCell row={row} options={options} width={widths.properties} />
            {showContributingLocations ? (
              <Text style={[styles.cellLocations, { width: COLUMN_WIDTHS.withLocations.locations }]}>
                {locationsLine(row)}
              </Text>
            ) : null}
            <Text style={[styles.cellQuantity, { width: widths.current, color: HEADING }]}>
              {displayedCount(row, countMode)}
            </Text>
            <Text style={[styles.cellQuantity, { width: widths.missing, color: MISSING }]}>
              {row.unitsToRestockTarget}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function SettingsBox({ model }: { model: StockPdfModel }) {
  const { settings } = model;
  return (
    <View style={styles.settingsBox} wrap={false}>
      <Text style={styles.settingsEyebrow}>Report settings</Text>
      <View style={styles.settingsLine}>
        <Text>
          <Text style={styles.settingsKey}>States · </Text>
          <Text style={styles.settingsValue}>{settings.states.join(", ")}</Text>
        </Text>
        <Text>
          <Text style={styles.settingsKey}>Grouping · </Text>
          <Text style={styles.settingsValue}>{settings.grouping}</Text>
        </Text>
        <Text>
          <Text style={styles.settingsKey}>Locations · </Text>
          <Text style={styles.settingsValue}>{settings.locations.join(", ")}</Text>
        </Text>
        <Text>
          <Text style={styles.settingsKey}>Count · </Text>
          <Text style={styles.settingsValue}>{settings.count}</Text>
        </Text>
      </View>
      <Text style={styles.settingsValue}>{settings.source}</Text>
    </View>
  );
}

// Screen 10: the A4 stock report. Everything on the page comes from P8's model; this
// component lays it out and nothing else (MC10, MC10a — the tiles count the document).
export function StockReportPdfDocument({
  model,
  options,
  filename,
  generatedAt,
}: StockReportPdfDocumentProps) {
  const dateLine = `${longDate.format(generatedAt)} · ${clock.format(generatedAt)}`;
  const generatedLine = `Generated ${shortDate(generatedAt)}, ${clock.format(generatedAt)}`;
  const runningEyebrow = `Stock report · ${shortDate(generatedAt)}`;

  return (
    <Document title="Stock report" author="Beyo Vintage" creator="Beyo scanner">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            <View style={styles.brandMark} />
            <Text style={styles.brandName}>Beyo Vintage</Text>
          </View>
          <Text
            style={styles.headerEyebrow}
            render={({ pageNumber }) => (pageNumber === 1 ? "Stock report" : runningEyebrow)}
          />
        </View>

        <Text style={styles.title}>Stock Report</Text>
        <Text style={styles.subtitle}>
          {dateLine} · {model.settings.locations.join(", ")}
        </Text>

        {model.summaryCounts ? <SummaryTiles counts={model.summaryCounts} /> : null}

        {model.sections.map((section) => (
          <Section
            key={section.state}
            section={section}
            options={options}
            showContributingLocations={model.showContributingLocations}
            countMode={model.countMode}
          />
        ))}

        <SettingsBox model={model} />

        <View style={styles.footer} fixed>
          <Text>{filename}</Text>
          <Text>{generatedLine}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
