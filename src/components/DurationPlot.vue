<template>
    <DcpModal v-model:is-active="model" size="xlarge" background-close show-close>
        <template #header>
            <h3 class="duration-plot__title">
                {{ t('duration-plot.title') }}
            </h3>
        </template>

        <div class="duration-plot">
            <v-select v-if="xAxisOptions.length > 1" v-model="selectedXAxisKey" class="duration-plot__controls"
                density="compact" hide-details :items="xAxisOptions" item-title="label" item-value="value"
                :label="xAxisLabel" variant="underlined" />

            <div v-if="hasRows" ref="chartContainer" class="duration-plot__chart">
                <DcpChart :data="chartData" :layout="chartLayout" :axes="chartAxes" :show-legend="false" />
            </div>

            <p v-else class="duration-plot__empty">{{ t('duration-plot.no-data') }}</p>
        </div>
    </DcpModal>
</template>

<script lang="ts" setup>
import { DcpModal } from '@open-dcp/vue-basic-components';
import { DcpChart, AxisPosition } from '@open-dcp/vue-charts';
import { computed, inject, nextTick, onBeforeUnmount, ref, watch, type PropType } from 'vue';
import type { DcpAxisConfig, DcpChartSeries, DcpChartTypes } from '@open-dcp/vue-charts';
import type { DurationPlotColumnOption, ProcessedGridRow } from '@/types/BatchGrid';

const model = defineModel<boolean>({ default: false });
const t = inject('t') as (key: string) => string;
const chartContainer = ref<HTMLElement | null>(null);
const chartWidth = ref(960);
const chartHeight = ref(520);
let resizeObserver: ResizeObserver | null = null;

const props = defineProps({
    rows: {
        type: Array as PropType<ProcessedGridRow[]>,
        required: true
    },
    xAxisColumns: {
        type: Array as PropType<DurationPlotColumnOption[]>,
        required: false,
        default: () => []
    }
});

const toTitleCase = (value: string): string => {
    return value
        .replace(/^value_/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getTimeLabel = (key: 'startTime' | 'endTime') => {
    const translationKey = key === 'startTime' ? 'columns.start-time' : 'columns.end-time';
    const translation = t(translationKey);

    if (translation !== translationKey) {
        return translation;
    }

    return key === 'startTime' ? 'Start Time' : 'End Time';
};

const sortXAxisOptions = (options: Array<{ label: string; value: string }>) => {
    const priority = new Map<string, number>([
        ['startTime', 0],
        ['endTime', 1]
    ]);

    return [...options].sort((left, right) => {
        const leftPriority = priority.get(left.value) ?? Number.MAX_SAFE_INTEGER;
        const rightPriority = priority.get(right.value) ?? Number.MAX_SAFE_INTEGER;

        if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
        }

        return 0;
    });
};

const xAxisOptions = computed(() => {
    if (props.xAxisColumns.length > 0) {
        const options = props.xAxisColumns.map((column) => ({
            label: column.label,
            value: column.key
        }));

        return sortXAxisOptions(options);
    }

    const excludedKeys = new Set(['__rowId', 'selected', 'disabled', 'isRunning', 'duration']);
    const optionKeys = new Set<string>();

    props.rows.forEach((row) => {
        Object.keys(row).forEach((key) => {
            if (!excludedKeys.has(key)) {
                optionKeys.add(key);
            }
        });
    });

    if (optionKeys.size === 0) {
        optionKeys.add('startTime');
    }

    const options = [...optionKeys].map((key) => ({
        label: key === 'startTime' || key === 'endTime'
            ? getTimeLabel(key)
            : toTitleCase(key),
        value: key
    }));

    return sortXAxisOptions(options);
});

const selectedXAxisKey = ref('startTime');

watch(
    xAxisOptions,
    (options) => {
        const currentOptionExists = options.some((option) => option.value === selectedXAxisKey.value);

        if (!currentOptionExists) {
            selectedXAxisKey.value = options[0]?.value ?? 'startTime';
        }
    },
    { immediate: true }
);

const xAxisLabel = computed(() => {
    const translation = t('duration-plot.x-axis');
    return translation === 'duration-plot.x-axis' ? 'X axis' : translation;
});

const chartRows = computed(() => {
    return props.rows
        .filter((row) => !row.disabled)
        .map((row) => ({
            row,
            durationHours: (Number(row.duration) || 0) / 3600
        }));
});

const hasRows = computed(() => chartRows.value.length > 0);

const xAxisTitle = computed(() => {
    const option = xAxisOptions.value.find((item) => item.value === selectedXAxisKey.value);
    return option?.label ?? selectedXAxisKey.value;
});

const toChartXValue = (rawValue: unknown): string | number => {
    if (rawValue === null || rawValue === undefined) {
        return '';
    }

    if (typeof rawValue === 'number') {
        return Number.isFinite(rawValue) ? rawValue : '';
    }

    if (rawValue instanceof Date) {
        return Number.isNaN(rawValue.getTime()) ? '' : rawValue.toISOString();
    }

    if (typeof rawValue === 'string') {
        const value = rawValue.trim();

        if (value === '') {
            return '';
        }

        if (/^-?\d+(\.\d+)?$/.test(value)) {
            const numericValue = Number(value);

            if (Number.isFinite(numericValue)) {
                return numericValue;
            }
        }

        return value;
    }

    return String(rawValue);
};

const chartEntries = computed(() => {
    const selectedKey = selectedXAxisKey.value;

    return chartRows.value.map(({ row, durationHours }) => {
        const rawValue = (row as Record<string, unknown>)[selectedKey];

        return {
            xValue: toChartXValue(rawValue),
            durationHours: Number(durationHours.toFixed(4))
        };
    });
});

const chartData = computed<DcpChartSeries[]>(() => {
    const entries = chartEntries.value;

    const rawXValues = entries.map((entry) => entry.xValue);
    const allNumericXValues = rawXValues.every((value) => typeof value === 'number');

    if (allNumericXValues) {
        const xValues = rawXValues as number[];
        const hasDuplicateCategories = new Set<number>(xValues).size !== xValues.length;

        if (hasDuplicateCategories) {
            // Plotly groups bars across traces (not within a single trace with duplicate x labels).
            return entries.map((entry, index) => ({
                type: 'bar' as DcpChartTypes,
                x: [xValues[index]],
                y: [entry.durationHours],
                style: {
                    marker: {
                        color: '#0072a8',
                        opacity: 0.85
                    }
                }
            }));
        }

        return [
            {
                type: 'bar' as DcpChartTypes,
                x: xValues,
                y: entries.map((entry) => entry.durationHours),
                style: {
                    marker: {
                        color: '#0072a8',
                        opacity: 0.85
                    }
                }
            }
        ];
    }

    const xValues = rawXValues.map((value) => String(value));
    const hasDuplicateCategories = new Set<string>(xValues).size !== xValues.length;

    if (hasDuplicateCategories) {
        // Plotly groups bars across traces (not within a single trace with duplicate x labels).
        return entries.map((entry, index) => ({
            type: 'bar' as DcpChartTypes,
            x: [xValues[index]],
            y: [entry.durationHours],
            style: {
                marker: {
                    color: '#0072a8',
                    opacity: 0.85
                }
            }
        }));
    }

    return [
        {
            type: 'bar' as DcpChartTypes,
            x: xValues,
            y: entries.map((entry) => entry.durationHours),
            style: {
                marker: {
                    color: '#0072a8',
                    opacity: 0.85
                }
            }
        }
    ];
});

const chartAxes = computed<DcpAxisConfig[]>(() => {
    return [
        {
            id: 'x',
            position: AxisPosition.Bottom,
            title: xAxisTitle.value
        },
        {
            id: 'y',
            position: AxisPosition.Left,
            title: `${t('columns.duration')} [h]`
        }
    ];
});

const chartLayout = computed(() => {
    return {
        width: chartWidth.value,
        height: chartHeight.value,
        barmode: 'group',
        responsive: true,
        margin: {
            l: 60,
            r: 20,
            t: 20,
            b: 80
        }
    };
});

const updateChartSize = () => {
    const container = chartContainer.value;

    if (!container) {
        return;
    }

    chartWidth.value = Math.max(Math.floor(container.clientWidth), 320);
    chartHeight.value = Math.max(Math.floor(container.clientHeight), 260);
};

const setupResizeObserver = async () => {
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    await nextTick();

    if (!chartContainer.value) {
        return;
    }

    updateChartSize();

    resizeObserver = new ResizeObserver(() => {
        updateChartSize();
    });

    resizeObserver.observe(chartContainer.value);
};

watch(
    () => [model.value, hasRows.value],
    async ([isOpen, hasData]) => {
        if (isOpen && hasData) {
            await setupResizeObserver();
            return;
        }

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
    },
    { immediate: true }
);

onBeforeUnmount(() => {
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
});
</script>

<style scoped>
.duration-plot {
    width: 100%;
    height: min(72vh, calc(100vh - 10rem));
    max-height: 72vh;
    padding-top: 1rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.duration-plot__title {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
}

.duration-plot__controls {
    width: 100%;
    max-width: none;
    margin-bottom: 0.75rem;
    flex-shrink: 0;
}

.duration-plot__chart {
    flex: 1 1 auto;
    min-height: 0;
}

.duration-plot__empty {
    margin: 0;
    color: rgb(0 0 0 / 65%);
}

.duration-plot__controls :deep(.v-input) {
    width: 100%;
}
</style>