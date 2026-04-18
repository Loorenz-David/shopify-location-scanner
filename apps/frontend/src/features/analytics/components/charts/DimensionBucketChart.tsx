import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DimensionBucket } from "../../types/analytics.types";

interface DimensionBucketChartProps {
  data: DimensionBucket[];
  title: string;
  selectedBucket?: DimensionBucket | null;
  onBucketClick?: (bucket: DimensionBucket) => void;
  onShowItemsClick?: (bucket: DimensionBucket) => void;
  onCloseSelection?: () => void;
}

export function DimensionBucketChart({
  data,
  title,
  selectedBucket = null,
  onBucketClick,
  onShowItemsClick,
  onCloseSelection,
}: DimensionBucketChartProps) {
  return (
    <section>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart
          accessibilityLayer={false}
          tabIndex={-1}
          data={data}
          margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
        >
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip content={() => null} cursor={false} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
          <Bar
            dataKey="soldCount"
            name="Sold"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            activeBar={false}
            onMouseDown={(entry) => {
              const bucket = getBucketFromBarEntry(entry);
              if (bucket) onBucketClick?.(bucket);
            }}
            onTouchStart={(entry) => {
              const bucket = getBucketFromBarEntry(entry);
              if (bucket) onBucketClick?.(bucket);
            }}
            onClick={(entry) => {
              const bucket = getBucketFromBarEntry(entry);
              if (bucket) onBucketClick?.(bucket);
            }}
          />
          <Bar
            dataKey="totalCount"
            name="Total"
            fill="#cbd5e1"
            radius={[4, 4, 0, 0]}
            activeBar={false}
            onMouseDown={(entry) => {
              const bucket = getBucketFromBarEntry(entry);
              if (bucket) onBucketClick?.(bucket);
            }}
            onTouchStart={(entry) => {
              const bucket = getBucketFromBarEntry(entry);
              if (bucket) onBucketClick?.(bucket);
            }}
            onClick={(entry) => {
              const bucket = getBucketFromBarEntry(entry);
              if (bucket) onBucketClick?.(bucket);
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      <AnimatePresence initial={false}>
        {selectedBucket ? (
          <motion.div
            key={selectedBucket.bucket}
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Selected range
                  </p>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                    {selectedBucket.label}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onShowItemsClick ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                      onClick={() => onShowItemsClick(selectedBucket)}
                    >
                      show items
                    </button>
                  ) : null}
                  {onCloseSelection ? (
                    <button
                      type="button"
                      aria-label="Close selection details"
                      className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500"
                      onClick={onCloseSelection}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                    Sold
                  </p>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                    {selectedBucket.soldCount}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Total
                  </p>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                    {selectedBucket.totalCount}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function getBucketFromBarEntry(entry: unknown): DimensionBucket | undefined {
  return (entry as { payload?: DimensionBucket }).payload;
}
