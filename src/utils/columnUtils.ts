import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { EventframeContext, ValueColumnDef, DisplayFormat, AttributeSettings } from '@/types/BatchGrid';
import { AttributeSettingValueType } from '@/enums/AttributeSettingValueType';

const DEFAULT_DISPLAY_FORMAT: Required<DisplayFormat> = {
    timeZone: 'UTC',
    dateFormat: 'yyyy-MM-dd',
    timeFormat: 'HH:mm:ss'
};

const VALUE_COLUMN_KEY_PREFIX = 'value_';

export const toColumnKey = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const toValueColumnKey = (name: string): string => `${VALUE_COLUMN_KEY_PREFIX}${toColumnKey(name)}`;

export const isValueColumnKey = (key: string): boolean => key.startsWith(VALUE_COLUMN_KEY_PREFIX);

export const inferColumnType = (
    value: number | string,
    valueType?: AttributeSettingValueType
): 'integer' | 'number' | 'string' | 'datetime' => {
    if (!valueType) {
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'integer' : 'number';
        }
        const trimmed = String(value).trim();
        if (/^-?\d+$/.test(trimmed)) return 'integer';
        if (/^-?\d+\.\d+$/.test(trimmed)) return 'number';
        return 'string';
    }

    const valueTypeToColumnType: Record<AttributeSettingValueType, 'integer' | 'number' | 'string' | 'datetime'> = {
        [AttributeSettingValueType.Double]: 'number',
        [AttributeSettingValueType.Int32]: 'integer',
        [AttributeSettingValueType.Single]: 'number',
        [AttributeSettingValueType.Decimal]: 'number',
        [AttributeSettingValueType.DateTime]: 'datetime',
        [AttributeSettingValueType.String]: 'string',
        [AttributeSettingValueType.Boolean]: 'string'
    };

    return valueType ? valueTypeToColumnType[valueType] : 'string';
};

export const buildValueColumns = (
    data: EventframeContext[],
    structure: AttributeSettings[]
): ValueColumnDef[] => {
    return (data[0]?.Values ?? [])
        .map((value) => {
            const columnStructure = structure.find((s) => s.Name === value.Name);
            const key = toValueColumnKey(value.Name);

            return {
                label: value.Name,
                key,
                type: inferColumnType(value.Value, columnStructure?.ValueType)
            };
        });
};

export const formatDateTime = (
    value: string,
    displayFormat?: DisplayFormat
): string => {
    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        const effectiveDisplayFormat = {
            ...DEFAULT_DISPLAY_FORMAT,
            ...displayFormat
        };

        const zonedDate = toZonedTime(date, effectiveDisplayFormat.timeZone);
        const dateTimeFormat = `${effectiveDisplayFormat.dateFormat} ${effectiveDisplayFormat.timeFormat}`;

        return format(zonedDate, dateTimeFormat);
    } catch (error) {
        return value;
    }
};

export const formatDuration = (seconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const remainingSeconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${remainingSeconds}`;
};
