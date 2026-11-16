import { differenceInSeconds } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const DEFAULT_TIME_ZONE = 'UTC';

const TIMEZONE_SUFFIX_REGEX = /(z|[+-]\d{2}:\d{2})$/i;

const isActiveBatchUtcDate = (value: Date): boolean => {
    return value.getUTCFullYear() === 9999 && value.getUTCMonth() === 11 && value.getUTCDate() === 31;
};

const parseDateTime = (value: string, timeZone: string): Date | null => {
    try {
        if (TIMEZONE_SUFFIX_REGEX.test(value)) {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const parsed = fromZonedTime(value, timeZone);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
        return null;
    }
};

export const getNowInTimeZone = (timeZone: string = DEFAULT_TIME_ZONE): Date => {
    const zonedNow = toZonedTime(new Date(), timeZone);
    return fromZonedTime(zonedNow, timeZone);
};

export const isActiveBatchEndTime = (value?: string | null): boolean => {
    if (value == null) {
        return false;
    }

    const parsedValue = new Date(value);
    return !Number.isNaN(parsedValue.getTime()) && isActiveBatchUtcDate(parsedValue);
};

export const resolveDurationEndTime = (
    endTime: string,
    timeZone: string = DEFAULT_TIME_ZONE
): Date | null => {
    if (isActiveBatchEndTime(endTime)) {
        return getNowInTimeZone(timeZone);
    }

    return parseDateTime(endTime, timeZone);
};

export const calculateDurationSeconds = (
    startTime: string,
    endTime: string,
    timeZone: string = DEFAULT_TIME_ZONE
): number => {
    const start = parseDateTime(startTime, timeZone);
    const end = resolveDurationEndTime(endTime, timeZone);

    if (start == null || end == null) {
        return 0;
    }

    return Math.max(0, differenceInSeconds(end, start));
};
