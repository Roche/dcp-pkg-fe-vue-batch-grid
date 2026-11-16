import type { Meta, StoryObj } from '@storybook/vue3';
import BatchGrid from '@/components/BatchGrid.vue';
import type { DisplayFormat, EventframeContext, AttributeSettings, ValueColumnDef } from '@/types/BatchGrid';
import { AttributeSettingValueType } from '@/enums/AttributeSettingValueType';
import type { TranslatorLike } from '@/composables/useTranslation';
import { useI18n } from 'vue-i18n';
import { ref, computed } from 'vue';

const displayFormat: DisplayFormat = {
  timeZone: 'UTC',
  dateFormat: 'yyyy-MM-dd',
  timeFormat: 'HH:mm:ss'
};

const yesterdayAtUtc = (hours: number, minutes: number, seconds = 0): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  date.setUTCHours(hours, minutes, seconds, 0);
  return date.toISOString();
};

const mockStructure: AttributeSettings[] = [
  { Name: 'Batch Name', Description: 'Batch identifier', ValueType: AttributeSettingValueType.String, UoM: '' },
  { Name: 'Temperature', Description: 'Process temperature', ValueType: AttributeSettingValueType.Double, UoM: '°C' },
  { Name: 'Operator', Description: 'Operator name', ValueType: AttributeSettingValueType.String, UoM: '' }
];

const mockData: EventframeContext[] = [
  {
    Id: 'evt-1001',
    StartTime: yesterdayAtUtc(7, 0, 0),
    EndTime: yesterdayAtUtc(7, 22, 10),
    RefWebId: 'web-id-1001',
    Values: [
      { Name: 'Batch Name', Value: 'A-101', Good: true },
      { Name: 'Temperature', Value: 71.2, Good: true },
      { Name: 'Operator', Value: 'M. Lopez', Good: true }
    ]
  },
  {
    Id: 'evt-1002',
    StartTime: yesterdayAtUtc(8, 15, 0),
    EndTime: yesterdayAtUtc(8, 45, 30),
    RefWebId: 'web-id-1002',
    Values: [
      { Name: 'Batch Name', Value: 'A-102', Good: true },
      { Name: 'Temperature', Value: 69.8, Good: true },
      { Name: 'Operator', Value: 'S. Smith', Good: true }
    ]
  },
  {
    Id: 'evt-1003',
    StartTime: yesterdayAtUtc(9, 0, 0),
    EndTime: yesterdayAtUtc(9, 5, 0),
    RefWebId: 'web-id-1003',
    Values: [
      { Name: 'Batch Name', Value: 'A-103', Good: true },
      { Name: 'Temperature', Value: 72.1, Good: false },
      { Name: 'Operator', Value: 'J. Patel', Good: true }
    ]
  },
  {
    Id: 'evt-1004',
    StartTime: yesterdayAtUtc(10, 10, 0),
    EndTime: '9999-12-31T23:59:59Z',
    RefWebId: 'web-id-1004',
    Values: [
      { Name: 'Batch Name', Value: 'A-104', Good: true },
      { Name: 'Temperature', Value: 70.4, Good: true },
      { Name: 'Operator', Value: 'K. Bauer', Good: true }
    ]
  }
];

const createLargeDataset = (count: number): EventframeContext[] => {
  const operators = ['M. Lopez', 'S. Smith', 'J. Patel', 'K. Bauer', 'R. Johnson', 'T. Brown'];

  return Array.from({ length: count }, (_, index) => {
    const eventNumber = index + 1;
    const startHour = 1 + (eventNumber % 22);
    const startMinute = (eventNumber * 7) % 60;
    const durationMinutes = 5 + ((eventNumber * 11) % 55);

    const startDate = new Date(yesterdayAtUtc(startHour, startMinute, 0));
    const endDate = new Date(startDate);
    endDate.setUTCMinutes(endDate.getUTCMinutes() + durationMinutes);

    return {
      Id: `evt-large-${eventNumber}`,
      StartTime: startDate.toISOString(),
      EndTime: eventNumber % 25 === 0 ? '9999-12-31T23:59:59Z' : endDate.toISOString(),
      RefWebId: `web-id-large-${eventNumber}`,
      Disabled: eventNumber % 17 === 0,
      Values: [
        { Name: 'Batch Name', Value: `B-${String(eventNumber).padStart(4, '0')}`, Good: true },
        { Name: 'Temperature', Value: Number((64 + (eventNumber % 18) + ((eventNumber % 10) / 10)).toFixed(1)), Good: eventNumber % 9 !== 0 },
        { Name: 'Operator', Value: operators[eventNumber % operators.length], Good: true }
      ]
    };
  });
};

const meta: Meta<typeof BatchGrid> = {
  title: 'Components/BatchGrid',
  component: BatchGrid,
  args: {
    data: mockData,
    displayFormat,
    structure: mockStructure,
    noneStickyCheckbox: false,
    noDuration: false,
    noDownload: false,
    noColumns: false
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTranslations: Story = {
  render: (args) => ({
    components: { BatchGrid },
    setup() {
      const { t } = useI18n({ useScope: 'global' });

      const translation: TranslatorLike = {
        translationPrefix: '@open-dcp/i18n',
        translator: (key: string) => String(t(key))
      };

      return {
        args,
        translation
      };
    },
    template: '<BatchGrid v-bind="args" :translation="translation" />'
  })
};

export const NoToolbarActions: Story = {
  args: {
    noDuration: true,
    noDownload: true,
    noColumns: true
  }
};

export const SelectionScopeControl: Story = {
  args: {
    allowSelectAll: true,
    showSelectionScopeControl: true,
    selectedRowIds: ['evt-1002']
  },
  render: (args) => ({
    components: { BatchGrid },
    setup() {
      const { t } = useI18n({ useScope: 'global' });

      const translation: TranslatorLike = {
        translationPrefix: '@open-dcp/i18n',
        translator: (key: string) => String(t(key))
      };

      return {
        args,
        translation
      };
    },
    template: '<BatchGrid v-bind="args" :translation="translation" />'
  }),
  parameters: {
    docs: {
      description: {
        story: 'Optional toolbar control to switch the row set between all rows, selected rows, and unselected rows.'
      }
    }
  }
};

export const GlobalSearchControl: Story = {
  args: {
    showGlobalSearchControl: true
  },
  render: (args) => ({
    components: { BatchGrid },
    setup() {
      const { t } = useI18n({ useScope: 'global' });
      const globalSearchQuery = ref('');
      const translation: TranslatorLike = {
        translationPrefix: '@open-dcp/i18n',
        translator: (key: string) => String(t(key))
      };

      return {
        args,
        globalSearchQuery,
        translation
      };
    },
    template: `
      <div class="space-y-2">
        <p class="text-sm text-gray-600">
          Try typing in the toolbar search input. The grid receives globalSearchQuery as
          <strong>{{ globalSearchQuery || '(empty)' }}</strong>.
        </p>
        <BatchGrid v-bind="args" :translation="translation" v-model:globalSearchQuery="globalSearchQuery" />
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows the optional toolbar global search input with simple two-way query binding.'
      }
    }
  }
};

export const CustomToolbarAction: Story = {
  render: (args) => ({
    components: { BatchGrid },
    setup() {
      const showDisabled = ref(false);

      const dataWithDisabled: EventframeContext[] = [
        ...mockData,
        {
          Id: 'evt-1005',
          StartTime: yesterdayAtUtc(11, 0, 0),
          EndTime: yesterdayAtUtc(11, 30, 0),
          RefWebId: 'web-id-1005',
          Disabled: true,
          Values: [
            { Name: 'Batch Name', Value: 'A-105', Good: true },
            { Name: 'Temperature', Value: 68.5, Good: true },
            { Name: 'Operator', Value: 'R. Johnson', Good: true }
          ]
        },
        {
          Id: 'evt-1006',
          StartTime: yesterdayAtUtc(12, 0, 0),
          EndTime: yesterdayAtUtc(12, 45, 0),
          RefWebId: 'web-id-1006',
          Values: [
            { Name: 'Batch Name', Value: 'A-106', Good: true },
            { Name: 'Temperature', Value: 71.3, Good: true },
            { Name: 'Operator', Value: 'T. Brown', Good: true }
          ]
        }
      ];

      const filteredData = computed(() => 
        showDisabled.value 
          ? dataWithDisabled 
          : dataWithDisabled.filter(row => !row.Disabled)
      );

      const toggleShowDisabled = () => {
        showDisabled.value = !showDisabled.value;
      };

      return {
        args,
        filteredData,
        showDisabled,
        toggleShowDisabled
      };
    },
    template: `
      <div class="space-y-2">
        <p class="text-sm text-gray-600 mb-4">
          Custom toolbar action: {{ showDisabled ? 'Showing all rows (including disabled)' : 'Hiding disabled rows' }}
        </p>
        <BatchGrid v-bind="args" :data="filteredData" :display-format="args.displayFormat">
          <template #toolbar-actions="{ hasRows }">
            <v-btn
              :disabled="!hasRows"
              :icon="showDisabled ? 'mdi-eye-off' : 'mdi-eye'"
              variant="plain"
              color="primary"
              density="comfortable"
              @click="toggleShowDisabled"
              title="Toggle disabled rows visibility"
            />
          </template>
        </BatchGrid>
      </div>
    `
  })
};

export const LazyLoadedValueColumns: Story = {
  render: (args) => ({
    components: { BatchGrid },
    setup() {
      const cacheDemoData = createLargeDataset(36);
      const valueColumns = ref<ValueColumnDef[]>([]);
      const hasLoadedColumns = ref(false);
      const isLoadingColumns = ref(false);
      const loadCounts = ref<Record<string, number>>({});

      const registerLoad = (columnLabel: string, refWebId: string) => {
        const loadKey = `${columnLabel} | ${refWebId}`;

        loadCounts.value = {
          ...loadCounts.value,
          [loadKey]: (loadCounts.value[loadKey] ?? 0) + 1
        };
      };

      const totalLoadCalls = computed(() => {
        return Object.values(loadCounts.value).reduce((sum, count) => sum + count, 0);
      });

      const uniqueLoadTargets = computed(() => {
        return Object.keys(loadCounts.value).length;
      });

      const visibleLoadCounts = computed(() => {
        return Object.entries(loadCounts.value).slice(0, 10);
      });

      const fetchValueColumns = async (): Promise<ValueColumnDef[]> => {
        return await new Promise((resolve) => {
          setTimeout(() => {
            resolve([
              {
                key: 'value_temperature_band',
                label: 'Temperature Band',
                type: 'string',
                loadValues: async (contexts) => {
                  const results: Record<string, string> = {};
                  for (const context of contexts) {
                    registerLoad('Temperature Band', context.refWebId);
                    results[context.columnKey + ':' + context.rowId] = context.refWebId.endsWith('1') || context.refWebId.endsWith('4') ? 'Hot' : 'Stable';
                  }
                  return results;
                }
              },
              {
                key: 'value_shift',
                label: 'Shift',
                type: 'string',
                loadValues: async (contexts) => {
                  const results: Record<string, string> = {};
                  for (const context of contexts) {
                    registerLoad('Shift', context.row?.RefWebId ?? 'unknown');
                    const hour = new Date(context.row?.StartTime ?? '').getUTCHours();

                    if (hour < 8) {
                      results[context.columnKey + ':' + context.rowId] = 'Morning';
                    } else if (hour < 16) {
                      results[context.columnKey + ':' + context.rowId] = 'Day';
                    } else {
                      results[context.columnKey + ':' + context.rowId] = 'Evening';
                    }
                  }
                  return results;
                }
              }
            ]);
          }, 600);
        });
      };

      const handleViewColumnsOpen = async () => {
        if (hasLoadedColumns.value || isLoadingColumns.value) {
          return;
        }

        isLoadingColumns.value = true;

        try {
          valueColumns.value = await fetchValueColumns();
          hasLoadedColumns.value = true;
        } finally {
          isLoadingColumns.value = false;
        }
      };

      return {
        args,
        cacheDemoData,
        hasLoadedColumns,
        isLoadingColumns,
        loadCounts,
        totalLoadCalls,
        uniqueLoadTargets,
        valueColumns,
        visibleLoadCounts,
        handleViewColumnsOpen
      };
    },
    template: `
      <div class="space-y-2">
        <p class="text-sm text-gray-600 mb-4">
          This story uses many rows so you can test virtual-scroll remounting. Batch Name, Temperature, and Operator are available by default from the row data. Open the column sidebar to lazy-load extra externally supplied columns into a separate Loaded columns section.
          Newly loaded columns start unchecked and stay hidden in the grid until you enable them.
          {{ isLoadingColumns ? ' Loading additional column metadata...' : hasLoadedColumns ? ' Additional column metadata loaded and available to enable.' : ' Additional column metadata not loaded yet.' }}
        </p>
        <div class="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <div><strong>Cache check:</strong> enable one of the loaded columns, scroll down, then back up. Previously seen row/cell combinations should not increment again.</div>
          <div class="mt-2">Total loader calls: {{ totalLoadCalls }}</div>
          <div>Unique row/column loads: {{ uniqueLoadTargets }}</div>
          <div class="mt-2" v-if="visibleLoadCounts.length > 0">
            <div><strong>First load counters</strong></div>
            <div v-for="[loadKey, count] in visibleLoadCounts" :key="loadKey">{{ loadKey }} -> {{ count }}</div>
          </div>
        </div>
        <BatchGrid
          v-bind="args"
          :data="cacheDemoData"
          :value-columns="valueColumns"
          default-value-columns-title="Available by default"
          @view-columns-open="handleViewColumnsOpen"
        />
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates a mixed column flow with many rows so you can observe cache reuse under virtual scrolling. Base value columns come from the batch data, extra externally supplied value columns are loaded only after the user opens the column sidebar, and visible cells resolve lazily with a delayed cached loader.'
      }
    }
  }
};

export const ManyRows: Story = {
  args: {
    data: createLargeDataset(500)
  }
};
