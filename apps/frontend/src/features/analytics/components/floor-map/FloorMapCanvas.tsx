import { Group, Layer, Rect, Stage, Text } from "react-konva";

import type { StoreZone, ZoneOverviewItem } from "../../types/analytics.types";
import { getZoneHeatColor } from "./FloorMapHeatOverlay";

interface FloorMapCanvasProps {
  zones: StoreZone[];
  zonesOverview: ZoneOverviewItem[];
  stageWidth: number;
  stageHeight: number;
  selectedZone: string | null;
  onZoneTap: (location: string) => void;
}

function pct(value: number, axisPx: number): number {
  return (value / 100) * axisPx;
}

export function FloorMapCanvas({
  zones,
  zonesOverview,
  stageWidth,
  stageHeight,
  selectedZone,
  onZoneTap,
}: FloorMapCanvasProps) {
  if (zones.length === 0) {
    return (
      <div
        style={{
          width: stageWidth,
          height: stageHeight,
          background: "#1e293b",
          borderRadius: 20,
        }}
        className="flex flex-col items-center justify-center gap-2"
      >
        <span className="text-sm font-medium text-slate-400">
          No zones drawn yet
        </span>
        <span className="text-xs text-slate-500">
          Go to Settings then Store Map to draw your floor plan
        </span>
      </div>
    );
  }

  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      style={{
        background: "#1e293b",
        borderRadius: 20,
      }}
    >
      <Layer>
        {zones.map((zone) => {
          const x = pct(zone.xPct, stageWidth);
          const y = pct(zone.yPct, stageHeight);
          const width = pct(zone.widthPct, stageWidth);
          const height = pct(zone.heightPct, stageHeight);

          if (zone.type === "corridor") {
            return (
              <Group key={zone.id}>
                <Rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill="#334155"
                  opacity={0.5}
                  stroke="#475569"
                  strokeWidth={1}
                  cornerRadius={4}
                />
                <Text
                  x={x + 6}
                  y={y + 6}
                  text={zone.label}
                  fontSize={9}
                  fill="#94a3b8"
                />
              </Group>
            );
          }

          const heatColor = getZoneHeatColor(zone.label, zonesOverview);
          const isSelected = selectedZone === zone.label;
          const zoneOverview = zonesOverview.find(
            (overview) => overview.location === zone.label,
          );

          return (
            <Group
              key={zone.id}
              onClick={() => onZoneTap(zone.label)}
              onTap={() => onZoneTap(zone.label)}
            >
              <Rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={heatColor}
                opacity={isSelected ? 0.88 : 0.58}
                stroke={isSelected ? "#ffffff" : "#475569"}
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={6}
              />
              <Text
                x={x + 6}
                y={y + 6}
                text={zone.label}
                fontSize={11}
                fontStyle="bold"
                fill="#ffffff"
                shadowColor="#0f172a"
                shadowBlur={4}
                shadowOpacity={0.6}
              />
              {zoneOverview ? (
                <Text
                  x={x + 6}
                  y={y + 22}
                  text={`${zoneOverview.itemsSold} sold`}
                  fontSize={10}
                  fill="#ffffff"
                  shadowColor="#0f172a"
                  shadowBlur={3}
                  shadowOpacity={0.5}
                />
              ) : null}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
