import { describe, expect, it } from 'vitest';
import { isActiveBatchEndTime } from '@/utils/timeUtils';

describe('timeUtils', () => {
    describe('isActiveBatchEndTime', () => {
        it('returns true for the canonical active batch end-time', () => {
            expect(isActiveBatchEndTime('9999-12-31T23:59:59Z')).toBe(true);
        });

        it('returns true for active batch end-time with milliseconds', () => {
            expect(isActiveBatchEndTime('9999-12-31T23:59:59.999Z')).toBe(true);
        });

        it('returns true for other times on 9999-12-31 in UTC', () => {
            expect(isActiveBatchEndTime('9999-12-31T00:00:00Z')).toBe(true);
        });

        it('returns false for neighboring UTC dates', () => {
            expect(isActiveBatchEndTime('9999-12-30T23:59:59.999Z')).toBe(false);
            expect(isActiveBatchEndTime('10000-01-01T00:00:00.000Z')).toBe(false);
        });

        it('returns false for invalid and empty values', () => {
            expect(isActiveBatchEndTime('not-a-date')).toBe(false);
            expect(isActiveBatchEndTime(undefined)).toBe(false);
            expect(isActiveBatchEndTime(null)).toBe(false);
        });
    });
});