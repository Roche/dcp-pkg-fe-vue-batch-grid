import { format } from 'date-fns';
import type { EventframeContext, DisplayFormat, ProcessedGridRow, AttributeSettings } from '@/types/BatchGrid';
import {
    buildValueColumns,
    formatDateTime,
    formatDuration
} from '@/utils/columnUtils';

type DownloadDetails = Record<string, unknown> | undefined;

const FORMULA_PREFIXES = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Escapes one CSV field.
 * - Text starting with `=`, `+`, `-`, `@`, tab or CR gets a leading `'` so spreadsheet apps don't evaluate it
 *   as a formula (CSV/formula injection). Plain numbers (`-5`, `+1.2e3`) are left as they are.
 * - Fields with `"`, `,`, CR or LF are quoted, `"` doubled.
 */
export const escapeCsvValue = (value: unknown, forceQuote = false): string => {
    let text = value == null ? '' : String(value);

    if (typeof value !== 'number' && FORMULA_PREFIXES.test(text) && !PLAIN_NUMBER.test(text)) {
        text = `'${text}`;
    }

    const escaped = text.replace(/"/g, '""');

    if (forceQuote || /[",\r\n]/.test(text)) {
        return `"${escaped}"`;
    }

    return escaped;
};

/** UTF-8 byte order mark: makes Excel read the file as UTF-8 (units like °C, non-Latin names). */
const UTF8_BOM = '\uFEFF';

/** Builds the CSV text (BOM + CRLF line endings). */
export const buildCsv = (metadataRows: unknown[][], contentRows: unknown[][]): string => {
    const metadataCsvRows = metadataRows.map((row) => row.map((value) => escapeCsvValue(value, true)).join(','));
    const contentCsvRows = contentRows.map((row) => row.map((value) => escapeCsvValue(value)).join(','));

    return UTF8_BOM + [...metadataCsvRows, ...contentCsvRows].join('\r\n');
};

type DownloadCsvOptions = {
    data: EventframeContext[];
    structure: AttributeSettings[];
    processedRows: ProcessedGridRow[];
    selectedRowIds: Set<string>;
    downloadDetails?: DownloadDetails;
    displayFormat?: DisplayFormat;
};

export const useDownloadable = () => {
    const downloadBatchGridCsv = ({
        data,
        structure,
        processedRows,
        selectedRowIds,
        displayFormat,
        downloadDetails
    }: DownloadCsvOptions) => {
        if (data.length === 0) return;

        const valueColumnDefs = buildValueColumns(data, structure);

        const selectedRows = processedRows.filter((row) => selectedRowIds.has(row.__rowId));
        const rowsToExport = selectedRows.length > 0 ? selectedRows : processedRows;

        const metadataRows = downloadDetails && typeof downloadDetails === 'object'
            ? Object.entries(downloadDetails).map(([key, value]) => [
                key,
                value == null ? '' : String(value)
            ])
            : [];

        const headerRow = [
            ...valueColumnDefs.map((column) => column.label),
            'Start time',
            'End time',
            'Duration'
        ];

        const dataRows = rowsToExport.map((row) => [
            ...valueColumnDefs.map((column) => row[column.key]),
            formatDateTime(row.startTime, displayFormat),
            formatDateTime(row.endTime, displayFormat),
            formatDuration(row.duration)
        ]);

        const csv = buildCsv(metadataRows, [headerRow, ...dataRows]);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `${new Date().getTime()}-BatchGrid.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return {
        downloadBatchGridCsv
    };
};
