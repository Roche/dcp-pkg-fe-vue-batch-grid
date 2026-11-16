import { format } from 'date-fns';
import type { EventframeContext, DisplayFormat, ProcessedGridRow, AttributeSettings } from '@/types/BatchGrid';
import {
    buildValueColumns,
    formatDateTime,
    formatDuration
} from '@/utils/columnUtils';

type DownloadDetails = Record<string, unknown> | undefined;

const escapeCsvValue = (value: unknown, forceQuote = false) => {
    const text = value == null ? '' : String(value);
    const escaped = text.replace(/"/g, '""');

    if (forceQuote || /[",\n]/.test(text)) {
        return `"${escaped}"`;
    }

    return escaped;
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

        const metadataCsvRows = metadataRows
            .map((row) => row.map((value) => escapeCsvValue(value, true)).join(','));

        const contentCsvRows = [headerRow, ...dataRows]
            .map((row) => row.map((value) => escapeCsvValue(value)).join(','));

        const csvRows = [...metadataCsvRows, ...contentCsvRows].join('\n');

        const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
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
