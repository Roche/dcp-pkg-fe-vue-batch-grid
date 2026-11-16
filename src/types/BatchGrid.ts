import { AttributeSettingValueType } from "@/enums/AttributeSettingValueType";

export type EventframeContextValue = {
    Name: string;
    Value: number | string;
    Good: boolean;
};

export type EventframeContext = {
    Id: string;
    StartTime: string;
    EndTime: string;
    RefWebId: string;
    Values: EventframeContextValue[];
    Disabled?: boolean;
};

export type AttributeSettings = {
    Name: string;
    Description: string;
    ValueType: AttributeSettingValueType;
    UoM: string;
};

export type DisplayFormat = {
    timeZone?: string;
    dateFormat?: string;
    timeFormat?: string;
};

export type DynamicValueLoadContext = {
    rowId: string;
    refWebId: string;
    columnKey: string;
    columnLabel: string;
    row?: EventframeContext;
};

export type DynamicValueBatchLoader = (contexts: DynamicValueLoadContext[]) => Promise<Record<string, string | number | null>>;

export type ValueColumnDef = {
    label: string;
    key: string;
    type: 'integer' | 'number' | 'string' | 'datetime';
    loadValues?: DynamicValueBatchLoader;
};

export type ValueColumnSection = {
    title: string;
    columns: ValueColumnDef[];
};

export type DurationPlotColumnOption = {
    key: string;
    label: string;
};

export type ProcessedGridRow = {
    __rowId: string;
    startTime: string;
    endTime: string;
    duration: number;
    disabled?: boolean;
} & Record<string, unknown>;