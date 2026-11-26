import { describe, it, expect } from 'vitest';
import { toValueColumnKey, buildValueColumns, isValueColumnKey, inferColumnType } from '@/utils/columnUtils';
import { AttributeSettingValueType } from '@/enums/AttributeSettingValueType';

describe('toValueColumnKey', () => {
    it('gives different attribute names different keys', () => {
        const names = ['Temp (C)', 'Temp C', 'temp_c', 'TEMP C', '温度', '压力', 'Δp', ''];
        const keys = names.map(toValueColumnKey);

        expect(new Set(keys).size).toBe(names.length);
    });

    it('is stable and recognisable as a value column key', () => {
        expect(toValueColumnKey('Temp (C)')).toBe(toValueColumnKey('Temp (C)'));
        expect(isValueColumnKey(toValueColumnKey('温度'))).toBe(true);
    });
});

describe('buildValueColumns', () => {
    it('creates one distinct column per attribute, also for CJK and similar names', () => {
        const data = [{
            Id: 'r1',
            Values: [
                { Name: 'Temp (C)', Value: 1, Good: true },
                { Name: 'Temp C', Value: 2, Good: true },
                { Name: '温度', Value: 3, Good: true },
                { Name: '压力', Value: 4, Good: true }
            ]
        }] as any;

        const columns = buildValueColumns(data, []);

        expect(columns.map(c => c.label)).toEqual(['Temp (C)', 'Temp C', '温度', '压力']);
        expect(new Set(columns.map(c => c.key)).size).toBe(4);
    });
});

describe('inferColumnType', () => {
    it('maps known value types and falls back to string for unknown ones', () => {
        expect(inferColumnType(1, AttributeSettingValueType.Int32)).toBe('integer');
        expect(inferColumnType('x', 'SomethingNew' as AttributeSettingValueType)).toBe('string');
    });
});
