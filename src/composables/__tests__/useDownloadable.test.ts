import { describe, it, expect } from 'vitest';
import { escapeCsvValue, buildCsv } from '@/composables/useDownloadable';

describe('escapeCsvValue', () => {
    it.each([
        ['=HYPERLINK("http://evil","x")', `"'=HYPERLINK(""http://evil"",""x"")"`],
        ['+SUM(A1:A2)', "'+SUM(A1:A2)"],
        ['-2+3', "'-2+3"],
        ['@cmd', "'@cmd"],
        ['\tTAB', "'\tTAB"],
    ])('neutralises formula %j', (input, expected) => {
        expect(escapeCsvValue(input)).toBe(expected);
    });

    it('keeps plain numbers (numbers and numeric strings)', () => {
        expect(escapeCsvValue(-5)).toBe('-5');
        expect(escapeCsvValue('-5.25')).toBe('-5.25');
        expect(escapeCsvValue('+1.2e3')).toBe('+1.2e3');
        expect(escapeCsvValue(0)).toBe('0');
    });

    it('quotes commas, quotes, LF and CR', () => {
        expect(escapeCsvValue('a,b')).toBe('"a,b"');
        expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
        expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
        expect(escapeCsvValue('line1\rline2')).toBe('"line1\rline2"');
    });

    it('handles empty values and forced quoting', () => {
        expect(escapeCsvValue(null)).toBe('');
        expect(escapeCsvValue(undefined)).toBe('');
        expect(escapeCsvValue('x', true)).toBe('"x"');
        expect(escapeCsvValue('=1+1', true)).toBe(`"'=1+1"`);
    });

    it('leaves normal text alone', () => {
        expect(escapeCsvValue('Temperature °C')).toBe('Temperature °C');
        expect(escapeCsvValue('a-b')).toBe('a-b');
    });
});

describe('buildCsv', () => {
    it('starts with a UTF-8 BOM and uses CRLF line endings', () => {
        const csv = buildCsv([['Site', 'Basel']], [['Name', 'Value'], ['Temp °C', -1]]);

        expect(csv.startsWith('﻿')).toBe(true);
        expect(csv.slice(1)).toBe('"Site","Basel"\r\nName,Value\r\nTemp °C,-1');
    });
});
