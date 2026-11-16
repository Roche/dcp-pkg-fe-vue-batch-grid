<template>
    <div :class="['dcp-batch-grid', { 'dcp-batch-grid--sticky-checkbox': !noneStickyCheckbox }]">
        <Toolbar :has-rows="hasRows" :has-selected-rows="hasSelectedRows" :no-duration="noDuration"
            :no-download="noDownload" :no-columns="noColumns" :allow-select-all="allowSelectAll" :can-select-all="canSelectAll"
            @select-all="handleSelectAll" @deselect-all="handleDeselectAll"
            @download="handleDownloadCsv" @show-columns="handleShowViewColumns"
            @show-duration-plot="handleShowDurationPlot" :show-selection-scope-control="showSelectionScopeControl"
            :selection-scope="selectionScope" @selection-scope-change="handleSelectionScopeChange"
            :show-global-search-control="showGlobalSearchControl" :global-search-query="globalSearchQueryState"
            @global-search-query-change="handleGlobalSearchQueryChange">
            <template #toolbar-actions="slotProps">
                <slot name="toolbar-actions" v-bind="slotProps" />
            </template>
        </Toolbar>

        <DcpGrid :rows="gridRows" :columns="columns" :displayFormat="displayFormat" sticky-header filterable
            advanced-filter :element-height="39.06" sortable :global-search="globalSearchState"
            @grid-ready="handleGridReady" @global-search-change="handleGridGlobalSearchChange" />
    </div>

    <ViewColumns v-model="showViewColumns" :value-column-sections="valueColumnSections"
        :hidden-column-keys="hiddenValueColumnKeysList" @toggle-column-visibility="handleToggleValueColumnVisibility" />
    <DurationPlot v-model="showDurationPlot" :rows="durationPlotRows" :x-axis-columns="durationPlotColumns" />
</template>

<script lang="ts" setup>
import { DcpGrid, type DcpGridService } from '@open-dcp/vue-grid';
import Toolbar from './Toolbar.vue';
import { computed, ref, watch, provide, type PropType } from 'vue';
import type { GlobalSearchState } from '@open-dcp/grid';
import Checkbox from './columns/Checkbox.vue';
import EndTimePresentation from './columns/EndTimePresentation.vue';
import DurationPresentation from './columns/DurationPresentation.vue';
import DynamicLoadPresentation from './columns/DynamicLoadPresentation.vue';
import type {
    EventframeContext,
    ProcessedGridRow,
    AttributeSettings,
    ValueColumnDef,
    ValueColumnSection,
    DurationPlotColumnOption
} from '@/types/BatchGrid';
import { useDownloadable } from '@/composables/useDownloadable';
import { buildValueColumns, formatDateTime, formatDuration, isValueColumnKey, toValueColumnKey } from '@/utils/columnUtils';
import { createDynamicValueCellCache } from '@/utils/dynamicValueCache';
import { calculateDurationSeconds, DEFAULT_TIME_ZONE, isActiveBatchEndTime } from '@/utils/timeUtils';
import ViewColumns from './ViewColumns.vue';
import DurationPlot from './DurationPlot.vue';
import { useTranslation, TranslatorLike } from '@/composables/useTranslation';

const selectionScopeOptions = ['all', 'selected', 'unselected'] as const;
type SelectionScope = typeof selectionScopeOptions[number];

const emit = defineEmits<{
    (e: 'selection-change', selectedRowIds: string[]): void;
    (e: 'update:selectedRowIds', selectedRowIds: string[]): void;
    (e: 'update:globalSearchQuery', query: string): void;
    (e: 'column-selection-change', selectedColumnKeys: string[]): void;
    (e: 'global-search-query-change', query: string): void;
    (e: 'view-columns-open'): void;
}>();

const props = defineProps({
    displayFormat: {
        type: Object,
        required: true
    },
    noneStickyCheckbox: {
        type: Boolean,
        default: false
    },
    data: {
        type: Array as PropType<EventframeContext[]>,
        required: true
    },
    selectedRowIds: {
        type: Array as PropType<string[] | undefined>,
        required: false,
        default: undefined
    },
    structure: {
        type: Array as PropType<AttributeSettings[]>,
        required: true
    },
    valueColumns: {
        type: Array as PropType<ValueColumnDef[] | undefined>,
        required: false,
        default: undefined
    },
    defaultValueColumnsTitle: {
        type: String,
        required: false,
        default: undefined
    },
    noDuration: {
        type: Boolean,
        default: false
    },
    noDownload: {
        type: Boolean,
        default: false
    },
    noColumns: {
        type: Boolean,
        default: false
    },
    allowSelectAll: {
        type: Boolean,
        default: false
    },
    downloadDetails: {
        type: Object,
        required: false
    },
    translation: {
        type: Object as PropType<TranslatorLike>,
        required: false,
    },
    showSelectionScopeControl: {
        type: Boolean,
        default: false
    },
    defaultSelectionScope: {
        type: String as PropType<SelectionScope>,
        default: 'all'
    },
    showGlobalSearchControl: {
        type: Boolean,
        default: false
    },
    globalSearchQuery: {
        type: String as PropType<string | undefined>,
        required: false,
        default: undefined
    }
});

const { t } = useTranslation(props.translation);
provide('t', t);

const selectedRowIds = ref(new Set<string>());
const lastActivatedRowId = ref<string | null>(null);
const gridService = ref<DcpGridService | null>(null);
const showViewColumns = ref(false);
const showDurationPlot = ref(false);
const selectionScope = ref<SelectionScope>(props.defaultSelectionScope);
const globalSearchQueryState = ref('');
const durationPlotRowIds = ref(new Set<string>());
const hiddenValueColumnKeys = ref(new Set<string>());
const previousExternalValueColumnKeys = ref(new Set<string>());
const { downloadBatchGridCsv } = useDownloadable();
const dynamicValueCellCache = createDynamicValueCellCache();

const hiddenValueColumnKeysList = computed(() => [...hiddenValueColumnKeys.value]);
const defaultValueColumnsSectionTitle = computed(() => props.defaultValueColumnsTitle ?? t('configure-columns.default-section-title'));
const loadedValueColumnsSectionTitle = computed(() => t('configure-columns.loaded-section-title'));

const defaultValueColumns = computed(() => buildValueColumns(props.data, props.structure));
const externalValueColumns = computed(() => {
    const defaultColumnKeys = new Set(defaultValueColumns.value.map((column) => column.key));

    return (props.valueColumns ?? []).filter((column) => !defaultColumnKeys.has(column.key));
});
const resolvedValueColumns = computed(() => {
    const mergedColumns = new Map<string, ValueColumnDef>();

    defaultValueColumns.value.forEach((column) => {
        mergedColumns.set(column.key, column);
    });

    externalValueColumns.value.forEach((column) => {
        mergedColumns.set(column.key, column);
    });

    return [...mergedColumns.values()];
});

const valueColumnSections = computed<ValueColumnSection[]>(() => {
    const sections: ValueColumnSection[] = [];

    if (defaultValueColumns.value.length > 0) {
        sections.push({
            title: defaultValueColumnsSectionTitle.value,
            columns: defaultValueColumns.value
        });
    }

    if (externalValueColumns.value.length > 0) {
        sections.push({
            title: loadedValueColumnsSectionTitle.value,
            columns: externalValueColumns.value
        });
    }

    return sections;
});

const sourceRowsById = computed(() => {
    return new Map(props.data.map((row) => [row.Id, row] as const));
});

watch(
    resolvedValueColumns,
    (nextValueColumns) => {
        const availableValueColumnKeys = new Set(nextValueColumns.map((column) => column.key));
        const nextExternalValueColumnKeys = new Set(externalValueColumns.value.map((column) => column.key));
        const nextHiddenValueColumnKeys = new Set(
            [...hiddenValueColumnKeys.value].filter((columnKey) => availableValueColumnKeys.has(columnKey))
        );

        nextExternalValueColumnKeys.forEach((columnKey) => {
            if (!previousExternalValueColumnKeys.value.has(columnKey)) {
                nextHiddenValueColumnKeys.add(columnKey);
            }
        });

        hiddenValueColumnKeys.value = nextHiddenValueColumnKeys;
        previousExternalValueColumnKeys.value = nextExternalValueColumnKeys;
    },
    { immediate: true }
);

const handleToggleValueColumnVisibility = ({ key, visible }: { key: string; visible: boolean }) => {
    if (!isValueColumnKey(key)) {
        return;
    }

    const nextHiddenValueColumnKeys = new Set(hiddenValueColumnKeys.value);

    if (visible) {
        nextHiddenValueColumnKeys.delete(key);
    } else {
        nextHiddenValueColumnKeys.add(key);
    }

    hiddenValueColumnKeys.value = nextHiddenValueColumnKeys;

    emit(
        'column-selection-change',
        resolvedValueColumns.value
            .map((column) => column.key)
            .filter((columnKey) => !nextHiddenValueColumnKeys.has(columnKey))
    );
};

const toArray = (rowIds: Set<string>) => [...rowIds];

const normalizeGlobalSearchQuery = (query: string) => query.trim();

const emitGlobalSearchQuery = (nextQuery: string, options: { emitModelUpdate: boolean }) => {
    emit('global-search-query-change', nextQuery);

    if (options.emitModelUpdate) {
        emit('update:globalSearchQuery', nextQuery);
    }
};

const updateGlobalSearchQuery = (
    nextQuery: string,
    options: { emitEvents: boolean; emitModelUpdate: boolean }
) => {
    if (globalSearchQueryState.value === nextQuery) {
        return false;
    }

    globalSearchQueryState.value = nextQuery;

    if (options.emitEvents) {
        emitGlobalSearchQuery(nextQuery, { emitModelUpdate: options.emitModelUpdate });
    }

    return true;
};

const globalSearchState = computed<GlobalSearchState | null>(() => {
    if (normalizeGlobalSearchQuery(globalSearchQueryState.value).length === 0) {
        return null;
    }

    // Make search case-insensitive for a friendlier default toolbar experience.
    return {
        query: globalSearchQueryState.value,
        options: {
            caseInsensitive: true
        }
    };
});

const normalizeSelectedRowIds = (rowIds: string[], availableIds: Set<string>) => {
    const normalized = new Set<string>();

    rowIds.forEach((rowId) => {
        if (availableIds.has(rowId)) {
            normalized.add(rowId);
        }
    });

    return normalized;
};

const areSetsEqual = (left: Set<string>, right: Set<string>) => {
    if (left.size !== right.size) {
        return false;
    }

    for (const value of left) {
        if (!right.has(value)) {
            return false;
        }
    }

    return true;
};

const emitSelection = (nextSelectedRowIds: Set<string>, options: { emitModelUpdate: boolean }) => {
    const selection = toArray(nextSelectedRowIds);

    emit('selection-change', selection);

    if (options.emitModelUpdate) {
        emit('update:selectedRowIds', selection);
    }
};

const updateSelection = (
    nextSelectedRowIds: Set<string>,
    options: { emitEvents: boolean; emitModelUpdate: boolean }
) => {
    if (areSetsEqual(selectedRowIds.value, nextSelectedRowIds)) {
        return false;
    }

    selectedRowIds.value = nextSelectedRowIds;

    if (options.emitEvents) {
        emitSelection(nextSelectedRowIds, { emitModelUpdate: options.emitModelUpdate });
    }

    return true;
};

const handleGridReady = (service: DcpGridService) => {
    gridService.value = service;
};

const setRowSelection = (rowIds: string[], selected: boolean) => {
    const nextSelectedRowIds = new Set(selectedRowIds.value);

    rowIds.forEach((rowId) => {
        if (selected) {
            nextSelectedRowIds.add(rowId);
            return;
        }

        nextSelectedRowIds.delete(rowId);
    });

    updateSelection(nextSelectedRowIds, {
        emitEvents: true,
        emitModelUpdate: true
    });
};

const handleCheckboxUpdate = ({ row, shiftKey }: { row: { __rowId: string; selected: boolean; disabled?: boolean }; shiftKey: boolean }) => {
    if (row.disabled) {
        return;
    }

    const targetSelected = !row.selected;

    if (shiftKey && lastActivatedRowId.value) {
        // Use grid service sorted/filtered order (works with virtualization).
        const sortedRows = gridService.value?.getFilteredAndSortRows?.() ?? [];
        let rowIds = sortedRows
            .map((gridRow: any) => {
                const rowId = gridRow?.__rowId;
                if (rowId == null) {
                    return '';
                }

                if (typeof rowId === 'object' && 'raw' in rowId) {
                    return String(rowId.raw);
                }

                return String(rowId);
            })
            .filter((id) => id.length > 0);

        // Fallback if service is not ready.
        if (rowIds.length === 0) {
            rowIds = processedRows.value.map((processedRow) => processedRow.__rowId);
        }

        const startIndex = rowIds.indexOf(lastActivatedRowId.value);
        const endIndex = rowIds.indexOf(row.__rowId);

        if (startIndex >= 0 && endIndex >= 0) {
            const rangeIds = rowIds
                .slice(
                    Math.min(startIndex, endIndex),
                    Math.max(startIndex, endIndex) + 1
                )
                .filter((rowId) => {
                    const foundRow = processedRows.value.find((r) => r.__rowId === rowId);
                    return !foundRow?.disabled;
                });

            setRowSelection(rangeIds, targetSelected);
            lastActivatedRowId.value = row.__rowId;
            return;
        }
    }

    setRowSelection([row.__rowId], targetSelected);
    lastActivatedRowId.value = row.__rowId;
};

const handleDeselectAll = () => {
    setRowSelection([...selectedRowIds.value], false);
};

const handleSelectAll = () => {
    setRowSelection(selectableRowIds.value, true);
};

const handleSelectionScopeChange = (nextSelectionScope: SelectionScope) => {
    if (!selectionScopeOptions.includes(nextSelectionScope)) {
        return;
    }

    selectionScope.value = nextSelectionScope;
};

const handleGlobalSearchQueryChange = (nextQuery: string) => {
    updateGlobalSearchQuery(nextQuery, {
        emitEvents: true,
        emitModelUpdate: true
    });
};

const handleGridGlobalSearchChange = (nextGlobalSearch: GlobalSearchState | null) => {
    updateGlobalSearchQuery(nextGlobalSearch?.query ?? '', {
        emitEvents: true,
        emitModelUpdate: true
    });
};

const handleDownloadCsv = () => {
    downloadBatchGridCsv({
        data: props.data,
        structure: props.structure,
        processedRows: processedRows.value,
        selectedRowIds: selectedRowIds.value,
        displayFormat: props.displayFormat,
        downloadDetails: props.downloadDetails
    });
};

const handleShowViewColumns = () => {
    emit('view-columns-open');
    showViewColumns.value = true;
};

const extractGridRowId = (gridRow: any) => {
    const rowId = gridRow?.__rowId;

    if (rowId == null) {
        return null;
    }

    if (typeof rowId === 'object' && 'raw' in rowId) {
        return String(rowId.raw);
    }

    return String(rowId);
};

const getFilteredAndSortedRowIds = () => {
    const filteredRows = gridService.value?.getFilteredAndSortRows?.() ?? [];

    const rowIds = filteredRows
        .map((gridRow: any) => extractGridRowId(gridRow))
        .filter((rowId: string | null): rowId is string => Boolean(rowId));

    if (rowIds.length > 0) {
        return rowIds;
    }

    return processedRows.value.map((row) => row.__rowId);
};

const handleShowDurationPlot = () => {
    durationPlotRowIds.value = new Set(getFilteredAndSortedRowIds());
    showDurationPlot.value = true;
};

const availableRowIds = computed(() => new Set(props.data.map((row) => row.Id)));
const previousAvailableRowIds = ref(new Set<string>());
const hasHandledInitialSelectionSync = ref(false);

watch(
    [availableRowIds, () => props.selectedRowIds],
    ([nextAvailableRowIds, nextControlledSelectedRowIds]) => {
        const didAvailableRowsChange = !areSetsEqual(previousAvailableRowIds.value, nextAvailableRowIds);
        previousAvailableRowIds.value = new Set(nextAvailableRowIds);

        if (nextControlledSelectedRowIds !== undefined) {
            const normalizedControlledSelectedRowIds = normalizeSelectedRowIds(nextControlledSelectedRowIds, nextAvailableRowIds);

            updateSelection(normalizedControlledSelectedRowIds, {
                emitEvents: false,
                emitModelUpdate: false
            });

            if (
                hasHandledInitialSelectionSync.value
                && didAvailableRowsChange
                && normalizedControlledSelectedRowIds.size !== nextControlledSelectedRowIds.length
            ) {
                emitSelection(normalizedControlledSelectedRowIds, { emitModelUpdate: true });
            }
        } else {
            const normalizedUncontrolledSelectedRowIds = normalizeSelectedRowIds(toArray(selectedRowIds.value), nextAvailableRowIds);

            updateSelection(normalizedUncontrolledSelectedRowIds, {
                emitEvents: true,
                emitModelUpdate: true
            });
        }

        if (lastActivatedRowId.value && !nextAvailableRowIds.has(lastActivatedRowId.value)) {
            lastActivatedRowId.value = null;
        }

        hasHandledInitialSelectionSync.value = true;
    },
    { immediate: true }
);

watch(
    () => props.globalSearchQuery,
    (nextGlobalSearchQuery) => {
        if (nextGlobalSearchQuery === undefined) {
            return;
        }

        updateGlobalSearchQuery(nextGlobalSearchQuery, {
            emitEvents: false,
            emitModelUpdate: false
        });
    },
    { immediate: true }
);

const columns = computed(() => {
    const checkbox = {
        key: 'actions',
        width: '40px',
        notSortable: true,
        notFilterable: true,
        // Selection state is UI-only and should not affect data search results.
        globalSearchText: () => '',
        component: Checkbox,
        componentPropsMapper: (_: any, row: any) => ({
            row,
            onUpdateRow: handleCheckboxUpdate
        })
    };

    const defaultColumns = [
        { key: 'startTime', label: t('columns.start-time'), type: 'datetime' },
        {
            key: 'endTime',
            label: t('columns.end-time'),
            filterType: 'datetime',
            type: 'datetime',
            globalSearchText: (value: any) => {
                const rawValue = String(value?.raw ?? '');

                if (isActiveBatchEndTime(rawValue)) {
                    return t('batch-running');
                }

                return formatDateTime(rawValue, props.displayFormat);
            },
            component: EndTimePresentation,
            componentPropsMapper: (value: any) => ({
                value: value.raw,
                displayFormat: props.displayFormat
            })
        },
        {
            key: 'duration',
            label: t('columns.duration'),
            type: 'duration',
            globalSearchText: (value: any, row: any) => {
                const durationSeconds = Number(value?.raw ?? 0);
                const isRunning = isActiveBatchEndTime(String(row?.endTime?.raw ?? ''));
                const durationLabel = formatDuration(Number.isFinite(durationSeconds) ? durationSeconds : 0);

                if (!isRunning) {
                    return durationLabel;
                }

                return `${durationLabel} ${t('batch-running')}`;
            },
            component: DurationPresentation,
            componentPropsMapper: (value: any, row: any) => ({
                value: value.raw,
                isRunning: isActiveBatchEndTime(row?.endTime?.raw),
            })
        },
    ];

    const visibleValueColumns = resolvedValueColumns.value
        .filter((column) => !hiddenValueColumnKeys.value.has(column.key))
        .map((column) => {
            if (!column.loadValues) {
                return column;
            }

            return {
                ...column,
                notSortable: true,
                notFilterable: true,
                component: DynamicLoadPresentation,
                componentPropsMapper: (_value: any, row: any) => {
                    const rowId = String(row?.__rowId ?? '');
                    const sourceRow = sourceRowsById.value.get(rowId);

                    return {
                        cache: dynamicValueCellCache,
                        cacheKey: `${column.key}:${rowId}`,
                        columnType: column.type,
                        displayFormat: props.displayFormat,
                        loadContext: {
                            rowId,
                            refWebId: sourceRow?.RefWebId ?? '',
                            columnKey: column.key,
                            columnLabel: column.label,
                            row: sourceRow
                        },
                        loadValues: column.loadValues
                    };
                }
            };
        });

    return [checkbox, ...visibleValueColumns, ...defaultColumns];
});

const durationByRowId = computed(() => {
    return new Map(
        props.data.map((row) => [
            row.Id,
            calculateDurationSeconds(
                row.StartTime,
                row.EndTime,
                props.displayFormat?.timeZone ?? DEFAULT_TIME_ZONE
            )
        ])
    );
});

const processedRows = computed<ProcessedGridRow[]>(() => {

    return props.data.map((row) => {
        const valueFields = Object.fromEntries(
            (row.Values ?? [])
                .map((v) => [toValueColumnKey(v.Name), v.Good ? v.Value : null] as const)
        );

        const processedRow = {
            __rowId: row.Id,
            selected: selectedRowIds.value.has(row.Id),
            startTime: row.StartTime,
            endTime: row.EndTime,
            duration: durationByRowId.value.get(row.Id) ?? 0,
            isRunning: isActiveBatchEndTime(row.EndTime),
            disabled: row.Disabled ?? false,
            ...valueFields
        } as ProcessedGridRow;

        return processedRow;
    });
});

const durationPlotRows = computed<ProcessedGridRow[]>(() => {
    if (durationPlotRowIds.value.size === 0) {
        return gridRows.value;
    }

    return gridRows.value.filter((row) => durationPlotRowIds.value.has(row.__rowId));
});

const gridRows = computed<ProcessedGridRow[]>(() => {
    if (!props.showSelectionScopeControl || selectionScope.value === 'all') {
        return processedRows.value;
    }

    const showSelectedRows = selectionScope.value === 'selected';

    return processedRows.value.filter((row) => {
        const isSelected = selectedRowIds.value.has(row.__rowId);
        return showSelectedRows ? isSelected : !isSelected;
    });
});

const durationPlotColumns = computed<DurationPlotColumnOption[]>(() => {
    return columns.value
        .filter((column: any) => {
            const key = String(column?.key ?? '');

            if (key === '' || key === 'actions' || key === 'duration') {
                return false;
            }

            return true;
        })
        .map((column: any) => {
            const key = String(column.key);
            const label = typeof column.label === 'string' && column.label.length > 0
                ? column.label
                : key;

            return {
                key,
                label
            };
        });
});

const hasRows = computed(() => gridRows.value.length > 0);
const hasSelectedRows = computed(() => selectedRowIds.value.size > 0);
const selectableRowIds = computed(() => {
    return processedRows.value
        .filter((row) => !row.disabled)
        .map((row) => row.__rowId);
});
const canSelectAll = computed(() => {
    return selectableRowIds.value.some((rowId) => !selectedRowIds.value.has(rowId));
});

watch(hasSelectedRows, (nextHasSelectedRows) => {
    if (!nextHasSelectedRows && selectionScope.value === 'selected') {
        selectionScope.value = 'all';
    }
});
</script>

<style scoped>
.dcp-batch-grid {
    background-color: #fff;
    border-radius: 0.25rem;
}

.dcp-batch-grid--sticky-checkbox :deep(.dcp-table-container thead) {
    z-index: 5 !important;
}

.dcp-batch-grid--sticky-checkbox :deep(.dcp-table-container td:first-child) {
    left: 0;
    position: sticky;
    background-color: #fff;
    z-index: 2;
}

.dcp-batch-grid--sticky-checkbox :deep(.dcp-table-container th:first-child) {
    left: 0;
    position: sticky;
    background-color: #fff;
    top: 0;
    z-index: 6 !important;
}

.dcp-batch-grid :deep(tbody tr:has(.checkbox-disabled)) {
    opacity: 0.55;
}
</style>