import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BatchGrid from '../BatchGrid.vue';
import DynamicLoadPresentation from '../columns/DynamicLoadPresentation.vue';
import type { AttributeSettings, DisplayFormat, EventframeContext, ValueColumnDef } from '@/types/BatchGrid';
import { AttributeSettingValueType } from '@/enums/AttributeSettingValueType';

let mockFilteredRowIds: string[] | null = null;

vi.mock('@open-dcp/vue-charts', async () => {
    const { defineComponent, h } = await import('vue');

    const DcpChart = defineComponent({
        name: 'DcpChart',
        setup() {
            return () => h('div', { class: 'mock-dcp-chart' });
        }
    });

    return {
        DcpChart,
        AxisPosition: {
            Bottom: 'bottom',
            Left: 'left'
        }
    };
});

vi.mock('@open-dcp/vue-grid', async () => {
    const { defineComponent, h, onMounted } = await import('vue');

    const DcpGrid = defineComponent({
        name: 'DcpGrid',
        props: {
            rows: {
                type: Array,
                default: () => []
            },
            columns: {
                type: Array,
                default: () => []
            },
            globalSearch: {
                type: Object,
                default: null
            }
        },
        emits: ['grid-ready', 'global-search-change'],
        setup(props, { emit }) {
            onMounted(() => {
                emit('grid-ready', {
                    getFilteredAndSortRows: () => {
                        if (mockFilteredRowIds && mockFilteredRowIds.length > 0) {
                            return mockFilteredRowIds.map((rowId) => ({ __rowId: rowId }));
                        }

                        return (props.rows as any[]).map((row) => ({ __rowId: row.__rowId }));
                    }
                });
            });

            return () => h(
                'div',
                { class: 'mock-grid' },
                [
                    ...(props.rows as any[]).map((row) => {
                        const mapper = (props.columns as any[])?.[0]?.componentPropsMapper?.(null, row);

                        return h(
                            'button',
                            {
                                class: 'row-checkbox',
                                'data-row-id': row.__rowId,
                                'data-selected': String(Boolean(row.selected)),
                                disabled: Boolean(row.disabled),
                                onClick: () => mapper?.onUpdateRow?.({ row, shiftKey: false })
                            },
                            row.selected ? 'selected' : 'unselected'
                        );
                    }),
                    h(
                        'button',
                        {
                            class: 'emit-grid-global-search',
                            onClick: () => emit('global-search-change', { query: 'from-grid' })
                        },
                        'emit grid search'
                    )
                ]
            );
        }
    });

    return { DcpGrid };
});

const displayFormat: DisplayFormat = {
    timeZone: 'UTC',
    dateFormat: 'yyyy-MM-dd',
    timeFormat: 'HH:mm:ss'
};

const structure: AttributeSettings[] = [
    {
        Name: 'Batch Name',
        Description: 'Batch identifier',
        ValueType: AttributeSettingValueType.String,
        UoM: ''
    }
];

const buildRows = (): EventframeContext[] => [
    {
        Id: 'row-1',
        StartTime: '2026-06-10T10:00:00Z',
        EndTime: '2026-06-10T10:15:00Z',
        RefWebId: 'ref-1',
        Values: [{ Name: 'Batch Name', Value: 'A', Good: true }]
    },
    {
        Id: 'row-2',
        StartTime: '2026-06-10T11:00:00Z',
        EndTime: '2026-06-10T11:15:00Z',
        RefWebId: 'ref-2',
        Values: [{ Name: 'Batch Name', Value: 'B', Good: true }]
    },
    {
        Id: 'row-3',
        StartTime: '2026-06-10T12:00:00Z',
        EndTime: '2026-06-10T12:15:00Z',
        RefWebId: 'ref-3',
        Disabled: true,
        Values: [{ Name: 'Batch Name', Value: 'C', Good: true }]
    }
];

const mountBatchGrid = (props: Record<string, unknown>) => {
    return mount(BatchGrid, {
        props: {
            data: buildRows(),
            structure,
            displayFormat,
            ...props
        },
        global: {
            stubs: {
                Toolbar: true,
                ViewColumns: true,
                DurationPlot: true
            }
        }
    });
};

const getCheckboxById = (wrapper: ReturnType<typeof mountBatchGrid>, rowId: string) => {
    return wrapper.find(`button.row-checkbox[data-row-id="${rowId}"]`);
};

beforeEach(() => {
    mockFilteredRowIds = null;
});

describe('BatchGrid selectedRowIds control', () => {
    it('passes only filtered rows to DurationPlot when opening chart', async () => {
        mockFilteredRowIds = ['row-2'];

        const durationPlotStub = {
            name: 'DurationPlot',
            props: {
                modelValue: {
                    type: Boolean,
                    default: false
                },
                rows: {
                    type: Array,
                    default: () => []
                },
                xAxisColumns: {
                    type: Array,
                    default: () => []
                }
            },
            template: '<div class="duration-plot-stub" :data-open="String(modelValue)" />'
        };

        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat
            },
            global: {
                stubs: {
                    Toolbar: false,
                    ViewColumns: true,
                    DurationPlot: durationPlotStub
                }
            }
        });

        await wrapper.findComponent({ name: 'Toolbar' }).vm.$emit('show-duration-plot');
        await wrapper.vm.$nextTick();

        const durationPlot = wrapper.findComponent({ name: 'DurationPlot' });
        const rows = durationPlot.props('rows') as Array<{ __rowId: string }>;
        const xAxisColumns = durationPlot.props('xAxisColumns') as Array<{ key: string; label: string }>;

        expect(rows.map((row) => row.__rowId)).toEqual(['row-2']);
        expect(xAxisColumns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'startTime' }),
                expect.objectContaining({ key: 'endTime' }),
                expect.objectContaining({ key: 'value_batch_name', label: 'Batch Name' })
            ])
        );

        mockFilteredRowIds = null;
    });

    it('keeps uncontrolled selection-change behavior', async () => {
        const wrapper = mountBatchGrid({});

        await getCheckboxById(wrapper, 'row-1').trigger('click');

        expect(wrapper.emitted('selection-change')).toEqual([[['row-1']]]);
        expect(getCheckboxById(wrapper, 'row-1').attributes('data-selected')).toBe('true');
    });

    it('optionally filters displayed rows to selected rows only', async () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                showSelectionScopeControl: true
            },
            global: {
                stubs: {
                    Toolbar: false,
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        await getCheckboxById(wrapper, 'row-1').trigger('click');
        await wrapper.findComponent({ name: 'Toolbar' }).vm.$emit('selection-scope-change', 'selected');
        await wrapper.vm.$nextTick();

        const rowsAfterScopeChange = wrapper.findComponent({ name: 'DcpGrid' }).props('rows') as Array<{ __rowId: string }>;
        expect(rowsAfterScopeChange.map((row) => row.__rowId)).toEqual(['row-1']);
    });

    it('updates global search state from toolbar query changes', async () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                showGlobalSearchControl: true
            },
            global: {
                stubs: {
                    Toolbar: false,
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        await wrapper.findComponent({ name: 'Toolbar' }).vm.$emit('global-search-query-change', 'row-2');
        await wrapper.vm.$nextTick();

        expect(wrapper.findComponent({ name: 'DcpGrid' }).props('globalSearch')).toEqual({
            query: 'row-2',
            options: { caseInsensitive: true }
        });
        expect(wrapper.emitted('global-search-query-change')).toEqual([['row-2']]);
        expect(wrapper.emitted('update:globalSearchQuery')).toEqual([['row-2']]);

        await wrapper.findComponent({ name: 'Toolbar' }).vm.$emit('global-search-query-change', '   ');
        await wrapper.vm.$nextTick();

        const globalSearchQueryEvents = wrapper.emitted('global-search-query-change');
        const updateGlobalSearchQueryEvents = wrapper.emitted('update:globalSearchQuery');

        expect(wrapper.findComponent({ name: 'DcpGrid' }).props('globalSearch')).toBeNull();
        expect(globalSearchQueryEvents?.[globalSearchQueryEvents.length - 1]).toEqual(['   ']);
        expect(updateGlobalSearchQueryEvents?.[updateGlobalSearchQueryEvents.length - 1]).toEqual(['   ']);
    });

    it('syncs globalSearchQuery prop changes into grid and toolbar', async () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                showGlobalSearchControl: true,
                globalSearchQuery: 'initial'
            },
            global: {
                stubs: {
                    Toolbar: false,
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        expect(wrapper.findComponent({ name: 'DcpGrid' }).props('globalSearch')).toEqual({
            query: 'initial',
            options: { caseInsensitive: true }
        });
        expect(wrapper.findComponent({ name: 'Toolbar' }).props('globalSearchQuery')).toBe('initial');

        await wrapper.setProps({ globalSearchQuery: 'updated' });

        expect(wrapper.findComponent({ name: 'DcpGrid' }).props('globalSearch')).toEqual({
            query: 'updated',
            options: { caseInsensitive: true }
        });
        expect(wrapper.findComponent({ name: 'Toolbar' }).props('globalSearchQuery')).toBe('updated');
    });

    it('propagates global-search-change emitted by the grid', async () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                showGlobalSearchControl: true
            },
            global: {
                stubs: {
                    Toolbar: false,
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        await wrapper.find('button.emit-grid-global-search').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.findComponent({ name: 'DcpGrid' }).props('globalSearch')).toEqual({
            query: 'from-grid',
            options: { caseInsensitive: true }
        });
        expect(wrapper.findComponent({ name: 'Toolbar' }).props('globalSearchQuery')).toBe('from-grid');
        expect(wrapper.emitted('global-search-query-change')).toEqual([['from-grid']]);
        expect(wrapper.emitted('update:globalSearchQuery')).toEqual([['from-grid']]);
    });

    it('provides globalSearchText for endTime and duration and excludes checkbox state', () => {
        const wrapper = mountBatchGrid({
            selectedRowIds: ['row-1']
        });

        const columns = wrapper.findComponent({ name: 'DcpGrid' }).props('columns') as Array<{
            key: string;
            globalSearchText?: (value: any, row: any) => string;
        }>;

        const checkboxColumn = columns.find((column) => column.key === 'actions');
        const endTimeColumn = columns.find((column) => column.key === 'endTime');
        const durationColumn = columns.find((column) => column.key === 'duration');

        expect(checkboxColumn?.globalSearchText?.(null, { selected: true, disabled: false })).toBe('');
        expect(checkboxColumn?.globalSearchText?.(null, { selected: false, disabled: false })).toBe('');
        expect(endTimeColumn?.globalSearchText?.({ raw: '9999-12-31T23:59:59Z' }, {})).toBe('batch-running');
        expect(endTimeColumn?.globalSearchText?.({ raw: '2026-06-10T10:15:00Z' }, {})).toBe('2026-06-10 10:15:00');
        expect(durationColumn?.globalSearchText?.({ raw: 900 }, { endTime: { raw: '2026-06-10T10:15:00Z' } })).toBe('00:15:00');
        expect(durationColumn?.globalSearchText?.({ raw: 900 }, { endTime: { raw: '9999-12-31T23:59:59Z' } })).toBe('00:15:00 batch-running');
    });

    it('optionally filters displayed rows to unselected rows only', async () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                showSelectionScopeControl: true
            },
            global: {
                stubs: {
                    Toolbar: false,
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        await getCheckboxById(wrapper, 'row-1').trigger('click');
        await wrapper.findComponent({ name: 'Toolbar' }).vm.$emit('selection-scope-change', 'unselected');
        await wrapper.vm.$nextTick();

        const unselectedRows = wrapper.findComponent({ name: 'DcpGrid' }).props('rows') as Array<{ __rowId: string }>;
        expect(unselectedRows.map((row) => row.__rowId)).toEqual(['row-2', 'row-3']);
    });

    it('syncs UI when selectedRowIds is updated externally', async () => {
        const wrapper = mountBatchGrid({
            selectedRowIds: ['row-2']
        });

        expect(getCheckboxById(wrapper, 'row-1').attributes('data-selected')).toBe('false');
        expect(getCheckboxById(wrapper, 'row-2').attributes('data-selected')).toBe('true');

        await wrapper.setProps({ selectedRowIds: ['row-1'] });

        expect(getCheckboxById(wrapper, 'row-1').attributes('data-selected')).toBe('true');
        expect(getCheckboxById(wrapper, 'row-2').attributes('data-selected')).toBe('false');
        expect(wrapper.emitted('update:selectedRowIds')).toBeUndefined();
        expect(wrapper.emitted('selection-change')).toBeUndefined();
    });

    it('emits update:selectedRowIds and selection-change on user selection in controlled mode', async () => {
        const wrapper = mountBatchGrid({
            selectedRowIds: []
        });

        await getCheckboxById(wrapper, 'row-1').trigger('click');

        expect(wrapper.emitted('update:selectedRowIds')).toEqual([[['row-1']]]);
        expect(wrapper.emitted('selection-change')).toEqual([[['row-1']]]);
    });

    it('selects all enabled rows from the toolbar in controlled mode', async () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                selectedRowIds: []
            },
            global: {
                stubs: {
                    Toolbar: false,
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        await wrapper.findComponent({ name: 'Toolbar' }).vm.$emit('select-all');

        expect(wrapper.emitted('update:selectedRowIds')).toEqual([[['row-1', 'row-2']]]);
        expect(wrapper.emitted('selection-change')).toEqual([[['row-1', 'row-2']]]);
    });

    it('keeps the toolbar select-all action disabled by default', () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                selectedRowIds: []
            },
            global: {
                stubs: {
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        const selectionManagement = wrapper.findComponent({ name: 'SelectionManagement' });

        expect(selectionManagement.props('allowSelectAll')).toBe(false);
        expect(selectionManagement.props('canSelectAll')).toBe(true);
    });

    it('shows the toolbar select-all action when allowSelectAll is enabled', () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                selectedRowIds: [],
                allowSelectAll: true
            },
            global: {
                stubs: {
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        const selectionManagement = wrapper.findComponent({ name: 'SelectionManagement' });

        expect(selectionManagement.props('allowSelectAll')).toBe(true);
        expect(selectionManagement.props('canSelectAll')).toBe(true);
    });

    it('hides the toolbar select-all action when all enabled rows are already selected', async () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                selectedRowIds: ['row-1', 'row-2']
            },
            global: {
                stubs: {
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        expect(wrapper.findAll('button').some((button) => button.text().includes('select-all'))).toBe(false);
    });

    it('prunes invalid ids after data changes and emits cleaned values', async () => {
        const wrapper = mountBatchGrid({
            selectedRowIds: ['row-1', 'row-2']
        });

        await wrapper.setProps({
            data: buildRows().filter((row) => row.Id !== 'row-1')
        });

        const updateEvents = wrapper.emitted('update:selectedRowIds');
        const selectionEvents = wrapper.emitted('selection-change');

        expect(updateEvents).toBeTruthy();
        expect(selectionEvents).toBeTruthy();
        expect(updateEvents?.[updateEvents.length - 1]).toEqual([['row-2']]);
        expect(selectionEvents?.[selectionEvents.length - 1]).toEqual([['row-2']]);
        expect(getCheckboxById(wrapper, 'row-2').attributes('data-selected')).toBe('true');
    });

    it('does not allow value columns to overwrite internal time fields', () => {
        const collisionRows: EventframeContext[] = [
            {
                Id: 'row-collision',
                StartTime: '2026-06-10T10:00:00Z',
                EndTime: '2026-06-10T10:15:00Z',
                RefWebId: 'ref-collision',
                Values: [
                    { Name: 'duration', Value: 999, Good: true },
                    { Name: 'startTime', Value: 'fake-start', Good: true },
                    { Name: 'endTime', Value: 'fake-end', Good: true }
                ]
            }
        ];

        const wrapper = mount(BatchGrid, {
            props: {
                data: collisionRows,
                structure: [
                    {
                        Name: 'duration',
                        Description: '',
                        ValueType: AttributeSettingValueType.Double,
                        UoM: ''
                    },
                    {
                        Name: 'startTime',
                        Description: '',
                        ValueType: AttributeSettingValueType.String,
                        UoM: ''
                    },
                    {
                        Name: 'endTime',
                        Description: '',
                        ValueType: AttributeSettingValueType.String,
                        UoM: ''
                    }
                ],
                displayFormat
            },
            global: {
                stubs: {
                    Toolbar: true,
                    ViewColumns: true,
                    DurationPlot: true
                }
            }
        });

        const grid = wrapper.findComponent({ name: 'DcpGrid' });
        const rows = grid.props('rows') as Record<string, unknown>[];
        const columns = grid.props('columns') as Array<{ key: string }>;

        expect(rows[0].startTime).toBe('2026-06-10T10:00:00Z');
        expect(rows[0].endTime).toBe('2026-06-10T10:15:00Z');
        expect(rows[0].duration).toBe(900);
        expect(rows[0].value_duration).toBe(999);
        expect(columns.filter((column) => column.key === 'duration')).toHaveLength(1);
        expect(columns.filter((column) => column.key === 'value_duration')).toHaveLength(1);
    });

    it('toggles visibility for value_ columns from ViewColumns', async () => {
        const viewColumnsStub = {
            name: 'ViewColumns',
            props: {
                modelValue: {
                    type: Boolean,
                    default: false
                },
                valueColumnSections: {
                    type: Array,
                    default: () => []
                },
                hiddenColumnKeys: {
                    type: Array,
                    default: () => []
                }
            },
            emits: ['update:modelValue', 'toggle-column-visibility'],
            template: '<div class="view-columns-stub" />'
        };

        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat
            },
            global: {
                stubs: {
                    Toolbar: true,
                    ViewColumns: viewColumnsStub,
                    DurationPlot: true
                }
            }
        });

        const gridBeforeToggle = wrapper.findComponent({ name: 'DcpGrid' });
        const columnsBeforeToggle = gridBeforeToggle.props('columns') as Array<{ key: string }>;

        expect(columnsBeforeToggle.some((column) => column.key === 'value_batch_name')).toBe(true);

        await wrapper.findComponent({ name: 'ViewColumns' }).vm.$emit('toggle-column-visibility', {
            key: 'value_batch_name',
            visible: false
        });
        await wrapper.vm.$nextTick();

        const gridAfterValueToggle = wrapper.findComponent({ name: 'DcpGrid' });
        const columnsAfterValueToggle = gridAfterValueToggle.props('columns') as Array<{ key: string }>;

        expect(columnsAfterValueToggle.some((column) => column.key === 'value_batch_name')).toBe(false);
        expect(wrapper.emitted('column-selection-change')).toEqual([[[]]]);

        await wrapper.findComponent({ name: 'ViewColumns' }).vm.$emit('toggle-column-visibility', {
            key: 'startTime',
            visible: false
        });
        await wrapper.vm.$nextTick();

        const columnsAfterInvalidToggle = wrapper.findComponent({ name: 'DcpGrid' }).props('columns') as Array<{ key: string }>;

        expect(columnsAfterInvalidToggle.some((column) => column.key === 'startTime')).toBe(true);
    });

    it('emits view-columns-open when the toolbar opens the column sidebar', async () => {
        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat
            },
            global: {
                stubs: {
                    DurationPlot: true,
                    ViewColumns: true
                }
            }
        });

        await wrapper.findComponent({ name: 'Toolbar' }).vm.$emit('show-columns');

        expect(wrapper.emitted('view-columns-open')).toEqual([[]]);
        expect(wrapper.findComponent({ name: 'ViewColumns' }).props('modelValue')).toBe(true);
    });

    it('keeps externally provided valueColumns hidden until the user enables them', async () => {
        const loadValues = vi.fn(async (contexts: any[]) => {
            const result: Record<string, string> = {};
            for (const context of contexts) {
                result[context.columnKey + ':' + context.rowId] = 'Hot';
            }
            return result;
        });

        const externalValueColumns: ValueColumnDef[] = [
            {
                key: 'value_external_temperature_band',
                label: 'External Temperature Band',
                type: 'string',
                loadValues
            }
        ];

        const viewColumnsStub = {
            name: 'ViewColumns',
            props: {
                modelValue: {
                    type: Boolean,
                    default: false
                },
                valueColumnSections: {
                    type: Array,
                    default: () => []
                },
                hiddenColumnKeys: {
                    type: Array,
                    default: () => []
                }
            },
            template: '<div class="view-columns-stub" />'
        };

        const wrapper = mount(BatchGrid, {
            props: {
                data: buildRows(),
                structure,
                displayFormat,
                valueColumns: externalValueColumns,
                defaultValueColumnsTitle: 'Always available'
            },
            global: {
                stubs: {
                    Toolbar: true,
                    ViewColumns: viewColumnsStub,
                    DurationPlot: true
                }
            }
        });

        const gridColumns = wrapper.findComponent({ name: 'DcpGrid' }).props('columns') as Array<{ key: string; label?: string }>;
        const viewColumnSections = wrapper.findComponent({ name: 'ViewColumns' }).props('valueColumnSections') as Array<{
            title: string;
            columns: ValueColumnDef[];
        }>;

        expect(gridColumns.some((column) => column.key === 'value_batch_name')).toBe(true);
        expect(gridColumns.some((column) => column.key === 'value_external_temperature_band')).toBe(false);
        expect(viewColumnSections).toEqual([
            {
                title: 'Always available',
                columns: [
                    {
                        key: 'value_batch_name',
                        label: 'Batch Name',
                        type: 'string'
                    }
                ]
            },
            {
                title: 'configure-columns.loaded-section-title',
                columns: externalValueColumns
            }
        ]);
        expect(wrapper.findComponent({ name: 'ViewColumns' }).props('hiddenColumnKeys')).toEqual(['value_external_temperature_band']);

        await wrapper.findComponent({ name: 'ViewColumns' }).vm.$emit('toggle-column-visibility', {
            key: 'value_external_temperature_band',
            visible: true
        });
        await wrapper.vm.$nextTick();

        const gridColumnsAfterEnable = wrapper.findComponent({ name: 'DcpGrid' }).props('columns') as Array<{
            key: string;
            label?: string;
            component?: unknown;
            componentPropsMapper?: (value: unknown, row: { __rowId: string }) => Record<string, unknown>;
        }>;
        const enabledExternalColumn = gridColumnsAfterEnable.find((column) => column.key === 'value_external_temperature_band');
        const mappedProps = enabledExternalColumn?.componentPropsMapper?.(null, { __rowId: 'row-1' });

        expect(enabledExternalColumn?.label).toBe('External Temperature Band');
        expect(enabledExternalColumn?.component).toBe(DynamicLoadPresentation);
        expect(mappedProps?.loadValues).toBe(loadValues);
        expect(mappedProps?.cacheKey).toBe('value_external_temperature_band:row-1');
    });
});
