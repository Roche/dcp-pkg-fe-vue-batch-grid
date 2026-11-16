import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DurationPlot from '../DurationPlot.vue';

vi.mock('@open-dcp/vue-charts', () => ({
    DcpChart: (() => {
        const { defineComponent, h } = require('vue');

        return defineComponent({
            name: 'DcpChart',
            props: {
                data: {
                    type: Array,
                    default: () => []
                },
                layout: {
                    type: Object,
                    default: () => ({})
                },
                axes: {
                    type: Array,
                    default: () => []
                },
                showLegend: {
                    type: Boolean,
                    default: undefined
                }
            },
            setup(_: unknown, { attrs }: { attrs: Record<string, unknown> }) {
                return () => h('div', { class: 'mock-dcp-chart', ...attrs });
            }
        });
    })(),
    AxisPosition: {
        Bottom: 'bottom',
        Left: 'left'
    }
}));

vi.mock('@open-dcp/vue-basic-components', () => ({
    DcpModal: (() => {
        const { defineComponent, h } = require('vue');

        return defineComponent({
            name: 'DcpModal',
            setup(_: unknown, { slots }: { slots: { default?: () => unknown } }) {
                return () => h('div', slots.default?.());
            }
        });
    })()
}));

class ResizeObserverMock {
    observe() {}
    disconnect() {}
}

const rows = [
    {
        __rowId: 'row-1',
        disabled: false,
        duration: 3600,
        startTime: '2026-06-10T10:00:00Z',
        endTime: '2026-06-10T10:15:00Z'
    },
    {
        __rowId: 'row-2',
        disabled: false,
        duration: 5400,
        startTime: '2026-06-10T10:00:00Z',
        endTime: '2026-06-10T11:30:00Z'
    }
];

describe('DurationPlot', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    });

    it('does not assign legend names when duplicate x values create multiple traces', async () => {
        const wrapper = mount(DurationPlot, {
            props: {
                modelValue: true,
                rows,
                xAxisColumns: [
                    { key: 'startTime', label: 'Start Time' }
                ]
            },
            global: {
                provide: {
                    t: (key: string) => key
                },
                stubs: {
                    'v-select': true
                }
            }
        });

        const chart = wrapper.findComponent({ name: 'DcpChart' });
        const data = chart.props('data') as Array<{ name?: string; x: string[]; y: number[] }>;
        const layout = chart.props('layout') as { showlegend?: boolean };
        const showLegend = chart.props('showLegend') as boolean | undefined;

        expect(data).toHaveLength(2);
        expect(data.every((series) => series.name === undefined)).toBe(true);
        expect(layout.showlegend).toBeUndefined();
        expect(showLegend).toBe(false);
    });
});