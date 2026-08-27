import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { AssistantResultTable, AssistantVisualization, AssistantVisualizationType } from '../../../../core/http/generated/ai-assistant/v1';

function toLabel(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Resolves a named axis field to its column index, falling back to a positional default when the field is absent/unrecognized. */
function resolveColumnIndex(columns: string[], fieldName: string | null | undefined, fallbackIndex: number): number {
  if (fieldName) {
    const index = columns.indexOf(fieldName);
    if (index !== -1) {
      return index;
    }
  }
  return fallbackIndex;
}

/**
 * The seven recognized `visualization.type` values this chart supports, per
 * `AssistantVisualizationType` (`table_only` renders nothing here — the
 * table is already shown separately by `ChatPanel`, `single_stat` renders
 * as a plain number tile, not an ECharts instance).
 */
const KNOWN_VISUALIZATION_TYPES: ReadonlySet<AssistantVisualizationType> = new Set([
  'bar_chart',
  'horizontal_bar_chart',
  'line_chart',
  'donut_chart',
  'funnel_chart',
  'single_stat',
  'table_only',
]);

/**
 * ECharts wrapper covering the closed `visualization.type` enum
 * (design-decisions.md "Chart Rendering — ECharts via `ngx-echarts`").
 * Provided at this (feature-leaf) component level only, per that same
 * decision's "lazy-loaded only into the `ai-assistant` feature route, never
 * bundled into the app shell" trade-off — not wired into `app.config.ts`.
 */
@Component({
  selector: 'kart-assistant-chart',
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './assistant-chart.html',
  styleUrl: './assistant-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantChart {
  readonly visualization = input.required<AssistantVisualization>();
  readonly data = input.required<AssistantResultTable>();

  /** `null` for `table_only`, an unmatched/future enum value (edge-cases.md's client-side default-case fallback), or `single_stat` (rendered separately, not via ECharts). */
  protected readonly chartOption = computed<EChartsCoreOption | null>(() => this.buildOption());

  protected readonly singleStatValue = computed<string | null>(() => {
    if (this.visualization().type !== 'single_stat') {
      return null;
    }
    const { columns, rows } = this.data();
    if (rows.length === 0) {
      return null;
    }
    const valueIndex = resolveColumnIndex(columns, this.visualization().yAxis, columns.length - 1);
    return toLabel(rows[0][valueIndex]);
  });

  private buildOption(): EChartsCoreOption | null {
    const visualization = this.visualization();
    const { columns, rows } = this.data();

    if (!KNOWN_VISUALIZATION_TYPES.has(visualization.type)) {
      // edge-cases.md "Frontend Renderer Gap for a `visualization.type`
      // Value" — log and fall back to no chart; the table still renders.
      console.warn(`[AssistantChart] Unrecognized visualization.type "${visualization.type}" — falling back to table only.`);
      return null;
    }

    switch (visualization.type) {
      case 'table_only':
      case 'single_stat':
        return null;
      case 'bar_chart':
        return this.categoryValueOption(columns, rows, visualization, 'bar', false);
      case 'horizontal_bar_chart':
        return this.categoryValueOption(columns, rows, visualization, 'bar', true);
      case 'line_chart':
        return this.categoryValueOption(columns, rows, visualization, 'line', false);
      case 'donut_chart':
        return this.pieOption(columns, rows, visualization);
      case 'funnel_chart':
        return this.funnelOption(columns, rows, visualization);
    }
  }

  private categoryValueOption(
    columns: string[],
    rows: unknown[][],
    visualization: AssistantVisualization,
    seriesType: 'bar' | 'line',
    horizontal: boolean,
  ): EChartsCoreOption {
    const categoryField = horizontal ? visualization.yAxis : visualization.xAxis;
    const valueField = horizontal ? visualization.xAxis : visualization.yAxis;
    const categoryIndex = resolveColumnIndex(columns, categoryField, 0);
    const valueIndex = resolveColumnIndex(columns, valueField, columns.length > 1 ? 1 : 0);

    const categories = rows.map((row) => toLabel(row[categoryIndex]));
    const values = rows.map((row) => toNumber(row[valueIndex]));

    const categoryAxis = { type: 'category' as const, data: categories };
    const valueAxis = { type: 'value' as const };

    return {
      title: { text: visualization.title },
      tooltip: {},
      grid: { containLabel: true },
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: [{ type: seriesType, data: values }],
    };
  }

  private pieOption(columns: string[], rows: unknown[][], visualization: AssistantVisualization): EChartsCoreOption {
    const nameIndex = resolveColumnIndex(columns, visualization.xAxis, 0);
    const valueIndex = resolveColumnIndex(columns, visualization.yAxis, columns.length > 1 ? 1 : 0);

    return {
      title: { text: visualization.title },
      tooltip: {},
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: rows.map((row) => ({ name: toLabel(row[nameIndex]), value: toNumber(row[valueIndex]) })),
        },
      ],
    };
  }

  private funnelOption(columns: string[], rows: unknown[][], visualization: AssistantVisualization): EChartsCoreOption {
    const nameIndex = resolveColumnIndex(columns, visualization.xAxis, 0);
    const valueIndex = resolveColumnIndex(columns, visualization.yAxis, columns.length > 1 ? 1 : 0);

    return {
      title: { text: visualization.title },
      tooltip: {},
      series: [
        {
          type: 'funnel',
          data: rows.map((row) => ({ name: toLabel(row[nameIndex]), value: toNumber(row[valueIndex]) })),
        },
      ],
    };
  }
}
