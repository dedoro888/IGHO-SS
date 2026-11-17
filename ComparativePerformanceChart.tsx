import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, Layers, BarChart2 } from 'lucide-react';

export interface PerformanceDataPoint {
  label: string; // e.g., 'Week 1', 'Jan', 'Mon'
  current: number;
  previous: number;
}

export interface MetricConfig {
  id: string;
  name: string;
  unit: string;
  isCurrency?: boolean;
  data: PerformanceDataPoint[];
}

interface ComparativePerformanceChartProps {
  title?: string;
  subtitle?: string;
  metrics: MetricConfig[];
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
}

export const ComparativePerformanceChart: React.FC<ComparativePerformanceChartProps> = ({
  title = 'Performance Comparison',
  subtitle = 'Compare key metrics between current and previous periods',
  metrics,
  currentPeriodLabel = 'Current Period',
  previousPeriodLabel = 'Previous Period',
}) => {
  const [selectedMetricId, setSelectedMetricId] = useState<string>(metrics[0]?.id || '');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeMetric = metrics.find((m) => m.id === selectedMetricId) || metrics[0];

  if (!activeMetric) return null;

  const totalCurrent = activeMetric.data.reduce((sum, d) => sum + d.current, 0);
  const totalPrevious = activeMetric.data.reduce((sum, d) => sum + d.previous, 0);
  const percentageDelta =
    totalPrevious > 0 ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100) : 0;
  const isPositive = percentageDelta >= 0;

  const maxVal = Math.max(
    ...activeMetric.data.map((d) => Math.max(d.current, d.previous)),
    1
  );

  const formatValue = (val: number) => {
    if (activeMetric.isCurrency) {
      return `₦${val.toLocaleString()}`;
    }
    return `${val.toLocaleString()} ${activeMetric.unit}`;
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header & Metric Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">{title}</h3>
              <p className="text-xs text-neutral-500">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Variable Metric Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
          {metrics.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMetricId(m.id);
                setHoveredIndex(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMetric.id === m.id
                  ? 'bg-black text-white shadow-xs'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-200/60'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-500">{currentPeriodLabel}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-black inline-block"></span>
          </div>
          <div className="text-xl font-black text-black">{formatValue(totalCurrent)}</div>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-500">{previousPeriodLabel}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 border border-neutral-400 inline-block"></span>
          </div>
          <div className="text-xl font-bold text-neutral-700">{formatValue(totalPrevious)}</div>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-neutral-500">Period Variance</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 text-sm font-extrabold px-2 py-0.5 rounded-md ${
                isPositive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {isPositive ? `+${percentageDelta}%` : `${percentageDelta}%`}
            </span>
            <span className="text-[10px] text-neutral-400">vs prior</span>
          </div>
        </div>
      </div>

      {/* Comparative Bar Chart Visualization */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-black rounded-xs inline-block"></span>
              <span className="font-semibold text-neutral-900">{currentPeriodLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-neutral-300 border border-neutral-400 rounded-xs inline-block"></span>
              <span className="font-semibold text-neutral-600">{previousPeriodLabel}</span>
            </div>
          </div>
          <span className="text-[11px] text-neutral-400">Hover bars for details</span>
        </div>

        {/* Chart Canvas with explicit Y-axis and gridlines */}
        <div className="pt-4 flex gap-3">
          {/* Y-Axis scale ticks */}
          <div className="flex flex-col justify-between items-end text-[10px] font-mono font-medium text-neutral-400 select-none pr-1 w-16 shrink-0 h-56 pb-6">
            <span>{formatValue(maxVal)}</span>
            <span>{formatValue(Math.round(maxVal * 0.75))}</span>
            <span>{formatValue(Math.round(maxVal * 0.5))}</span>
            <span>{formatValue(Math.round(maxVal * 0.25))}</span>
            <span>{formatValue(0)}</span>
          </div>

          {/* Plot Area */}
          <div className="relative flex-1 h-56">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
              <div className="border-b border-neutral-100 w-full" />
              <div className="border-b border-neutral-100 w-full" />
              <div className="border-b border-neutral-100 w-full" />
              <div className="border-b border-neutral-100 w-full" />
              <div className="border-b border-neutral-300 w-full" />
            </div>

            {/* Bars container */}
            <div className="relative h-full w-full flex items-end justify-between gap-2 sm:gap-4 pb-6">
              {activeMetric.data.map((point, idx) => {
                const currentHeight = Math.max((point.current / maxVal) * 100, 2);
                const prevHeight = Math.max((point.previous / maxVal) * 100, 2);
                const isHovered = hoveredIndex === idx;

                return (
                  <div
                    key={point.label}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute -top-14 z-20 bg-neutral-900 text-white text-[10px] py-1.5 px-2.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 space-y-0.5 border border-neutral-700">
                        <div className="font-bold text-neutral-300">{point.label}</div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white font-mono">{currentPeriodLabel}:</span>
                          <span className="font-bold">{formatValue(point.current)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-neutral-400 font-mono">{previousPeriodLabel}:</span>
                          <span className="text-neutral-300">{formatValue(point.previous)}</span>
                        </div>
                      </div>
                    )}

                    {/* Bars Group */}
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                      {/* Previous Period Bar */}
                      <div
                        style={{ height: `${prevHeight}%` }}
                        className="w-1/2 max-w-[24px] bg-neutral-200 hover:bg-neutral-300 rounded-t transition-all duration-300 border-t border-x border-neutral-300"
                        title={`${previousPeriodLabel}: ${formatValue(point.previous)}`}
                      />
                      {/* Current Period Bar */}
                      <div
                        style={{ height: `${currentHeight}%` }}
                        className={`w-1/2 max-w-[24px] rounded-t transition-all duration-300 ${
                          isHovered ? 'bg-neutral-800 ring-2 ring-black' : 'bg-black hover:bg-neutral-800'
                        }`}
                        title={`${currentPeriodLabel}: ${formatValue(point.current)}`}
                      />
                    </div>

                    {/* Bottom Label on X-Axis */}
                    <span className="absolute -bottom-5 text-[10px] sm:text-[11px] font-semibold text-neutral-600 truncate max-w-[50px] text-center">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
