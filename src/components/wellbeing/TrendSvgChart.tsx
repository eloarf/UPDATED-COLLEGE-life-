import React from 'react';
import { formatDisplayDate } from '../../utils/dateUtils';

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  values: (number | null | undefined)[];
}

interface TrendSvgChartProps {
  labels: string[];
  rawKeys: string[];
  series: ChartSeries[];
  yMin?: number;
  yMax?: number;
  ySuffix?: string;
  height?: number;
  onSelectDateKey?: (dateKey: string) => void;
  selectedDateKey?: string | null;
}

export const TrendSvgChart: React.FC<TrendSvgChartProps> = ({
  labels,
  rawKeys,
  series,
  yMin = 1,
  yMax = 5,
  ySuffix = '',
  height = 190,
  onSelectDateKey,
  selectedDateKey,
}) => {
  const width = 640;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const count = labels.length;
  const yTicks = yMax === 5 && yMin === 1 ? [1, 2, 3, 4, 5] : [0, 25, 50, 75, 100];

  const getX = (idx: number) => {
    if (count <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (count - 1)) * plotW;
  };

  const getY = (val: number) => {
    const clamped = Math.min(yMax, Math.max(yMin, val));
    const ratio = (clamped - yMin) / Math.max(1, yMax - yMin);
    return padTop + plotH - ratio * plotH;
  };

  // Pick at most 6 evenly spaced x-axis labels to avoid overlap
  const labelIndices = new Set<number>();
  if (count <= 6) {
    for (let i = 0; i < count; i++) labelIndices.add(i);
  } else {
    labelIndices.add(0);
    labelIndices.add(count - 1);
    const step = Math.ceil((count - 1) / 4);
    for (let i = step; i < count - 1; i += step) labelIndices.add(i);
  }

  return (
    <div className="space-y-2.5">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[rgb(var(--c-muted))]">
        {series.map((s) => (
          <div key={s.id} className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 rounded-full inline-block"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="font-medium text-[rgb(var(--c-text))]">{s.label}</span>
          </div>
        ))}
        {onSelectDateKey && count > 0 && (
          <span className="text-[11px] text-[rgb(var(--c-muted))] sm:ml-auto">
            Tap any point to inspect recorded day details
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[300px] select-none"
          role="img"
          aria-label="Trend visualization"
        >
          {/* Horizontal Grid Lines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                  opacity={0.55}
                  className="font-mono tabular-nums"
                >
                  {tick}
                  {ySuffix}
                </text>
              </g>
            );
          })}

          {/* Lines & Points */}
          {series.map((s) => {
            // Break path across null gaps so unrecorded days are NEVER interpolated as 0 or connected misleadingly across long gaps if null
            const segments: { x: number; y: number; idx: number; val: number }[][] = [];
            let currentSeg: { x: number; y: number; idx: number; val: number }[] = [];

            s.values.forEach((val, idx) => {
              if (typeof val === 'number' && !Number.isNaN(val)) {
                currentSeg.push({ x: getX(idx), y: getY(val), idx, val });
              } else if (currentSeg.length > 0) {
                segments.push(currentSeg);
                currentSeg = [];
              }
            });
            if (currentSeg.length > 0) segments.push(currentSeg);

            return (
              <g key={s.id}>
                {segments.map((seg, segIdx) => {
                  if (seg.length < 2) return null;
                  const d = seg
                    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
                    .join(' ');
                  return (
                    <path
                      key={segIdx}
                      d={d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2.25}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {s.values.map((val, idx) => {
                  if (typeof val !== 'number' || Number.isNaN(val)) return null;
                  const cx = getX(idx);
                  const cy = getY(val);
                  const key = rawKeys[idx];
                  const isSelected = selectedDateKey && selectedDateKey === key;

                  return (
                    <g key={`${s.id}-${idx}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 5.5 : 3.75}
                        fill={s.color}
                        stroke="rgb(var(--c-surface))"
                        strokeWidth={1.5}
                      />
                      {onSelectDateKey && key && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={14}
                          fill="transparent"
                          className="cursor-pointer"
                          onClick={() => onSelectDateKey(key)}
                        >
                          <title>{`${formatDisplayDate(key)}: ${s.label} ${val}${ySuffix}`}</title>
                        </circle>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* X-axis Labels */}
          {labels.map((lbl, idx) => {
            if (!labelIndices.has(idx)) return null;
            const x = getX(idx);
            return (
              <text
                key={`${lbl}-${idx}`}
                x={x}
                y={height - 6}
                textAnchor={idx === 0 ? 'start' : idx === count - 1 ? 'end' : 'middle'}
                fontSize="10"
                fill="currentColor"
                opacity={0.6}
                className="font-mono tabular-nums"
              >
                {lbl}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
