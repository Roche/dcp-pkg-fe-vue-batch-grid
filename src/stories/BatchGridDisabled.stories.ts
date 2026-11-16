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

const mockDataWithDisabled: EventframeContext[] = [
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
    Disabled: true,
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
    Disabled: true,
    Values: [
      { Name: 'Batch Name', Value: 'A-104', Good: true },
      { Name: 'Temperature', Value: 70.4, Good: true },
      { Name: 'Operator', Value: 'K. Bauer', Good: true }
    ]
  },
  {
    Id: 'evt-1005',
    StartTime: yesterdayAtUtc(11, 0, 0),
    EndTime: yesterdayAtUtc(11, 15, 0),
    RefWebId: 'web-id-1005',
    Disabled: true,
    Values: [
      { Name: 'Batch Name', Value: 'A-105', Good: true },
      { Name: 'Temperature', Value: 68.9, Good: false },
      { Name: 'Operator', Value: 'R. Kumar', Good: true }
    ]
  }
];

const meta: Meta<typeof BatchGrid> = {
  title: 'Components/BatchGrid/Disabled Records',
  component: BatchGrid,
  args: {
    data: mockDataWithDisabled,
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

export const WithDisabledRows: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Displays a batch grid with some rows marked as disabled. Disabled rows cannot be selected and are visually grayed out with reduced opacity. The checkbox icon for disabled rows is also dimmed to indicate they cannot be interacted with.'
      }
    }
  }
};
