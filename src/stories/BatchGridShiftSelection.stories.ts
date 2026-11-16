import type { Meta, StoryObj } from '@storybook/vue3';
import BatchGrid from '@/components/BatchGrid.vue';
import type { DisplayFormat, EventframeContext, AttributeSettings } from '@/types/BatchGrid';
import { AttributeSettingValueType } from '@/enums/AttributeSettingValueType';

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
  { Name: 'Batch Name', Description: 'Batch identifier', ValueType: AttributeSettingValueType.Boolean, UoM: '' },
  { Name: 'Temperature', Description: 'Process temperature', ValueType: AttributeSettingValueType.Double, UoM: '°C' },
  { Name: 'Operator', Description: 'Operator name', ValueType: AttributeSettingValueType.Boolean, UoM: '' }
];

const operators = [
  'A. Novak',
  'L. Kim',
  'M. Rossi',
  'S. Ibrahim',
  'T. Evans',
  'J. Keller'
];

const shiftSelectionData: EventframeContext[] = Array.from({ length: 30 }, (_, i) => {
  const index = i + 1;
  const startHour = 6 + Math.floor(i / 2);
  const startMinute = (i * 13) % 60;
  const durationMinutes = 14 + (i % 5) * 6;

  const totalEndMinutes = startMinute + durationMinutes;
  const endHour = startHour + Math.floor(totalEndMinutes / 60);
  const endMinute = totalEndMinutes % 60;

  const temperature = Number((62 + ((i * 7) % 34) + (i % 3) * 0.3).toFixed(1));
  const disabled = index % 4 === 0;

  return {
    Id: `evt-${2000 + index}`,
    StartTime: yesterdayAtUtc(startHour, startMinute, 0),
    EndTime: yesterdayAtUtc(endHour, endMinute, 0),
    RefWebId: `web-id-${2000 + index}`,
    Disabled: disabled,
    Values: [
      { Name: 'Batch Name', Value: `S-${100 + index}`, Good: true },
      { Name: 'Temperature', Value: temperature, Good: true },
      { Name: 'Operator', Value: operators[i % operators.length], Good: true }
    ]
  };
});

const meta: Meta<typeof BatchGrid> = {
  title: 'Components/BatchGrid/Shift Selection',
  component: BatchGrid,
  args: {
    data: shiftSelectionData,
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

export const SortedRangeSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Test case for shift-range selection after sorting. Sort by Temperature, click an enabled row checkbox, then Shift+click another enabled row. Disabled rows in the selected range should remain unselected.'
      }
    }
  }
};
