import { TestBed } from '@angular/core/testing';

import { AssistantResultTable, AssistantVisualization, AssistantVisualizationType } from '../../../../core/http/generated/ai-assistant/v1';
import { AssistantChart } from './assistant-chart';

describe('AssistantChart', () => {
  function createFixture(visualization: AssistantVisualization, data: AssistantResultTable) {
    const fixture = TestBed.createComponent(AssistantChart);
    fixture.componentRef.setInput('visualization', visualization);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a single_stat as a plain number tile, not a chart canvas', () => {
    const fixture = createFixture(
      { type: 'single_stat', title: 'Revenue', yAxis: 'revenue' },
      { columns: ['revenue'], rows: [[4820]] },
    );
    expect(fixture.nativeElement.querySelector('.kart-assistant-chart__single-stat-value').textContent).toContain('4820');
    expect(fixture.nativeElement.querySelector('[echarts]')).toBeNull();
  });

  it('renders nothing for table_only (the table is shown separately)', () => {
    const fixture = createFixture({ type: 'table_only', title: 'Log' }, { columns: ['a'], rows: [['x']] });
    expect(fixture.nativeElement.querySelector('.kart-assistant-chart__single-stat-value')).toBeNull();
    expect(fixture.nativeElement.querySelector('[echarts]')).toBeNull();
  });

  it('builds a bar chart option for bar_chart', () => {
    const fixture = createFixture(
      { type: 'bar_chart', title: 'Revenue by product', xAxis: 'product', yAxis: 'revenue' },
      { columns: ['product', 'revenue'], rows: [['Widget', 100]] },
    );
    const option = fixture.componentInstance['chartOption']();
    expect(option).toBeTruthy();
    expect((option as { series: { type: string }[] }).series[0].type).toBe('bar');
  });

  it('falls back to no chart (table stays visible) for an unrecognized visualization.type, logging a warning', () => {
    spyOn(console, 'warn');
    const fixture = createFixture(
      { type: 'some_future_type' as unknown as AssistantVisualizationType, title: 'Unknown' },
      { columns: ['a'], rows: [['x']] },
    );
    expect(fixture.componentInstance['chartOption']()).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });
});
