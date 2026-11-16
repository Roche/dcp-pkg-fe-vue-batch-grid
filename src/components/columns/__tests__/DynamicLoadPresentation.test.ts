import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DynamicLoadPresentation from '../DynamicLoadPresentation.vue';
import { createDynamicValueCellCache } from '@/utils/dynamicValueCache';

describe('DynamicLoadPresentation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('waits 500ms for mount confirmation, then 1s for batch collection before loading', async () => {
        const loadValues = vi.fn(async (contexts: any[]) => {
            return {
                [contexts[0].columnKey + ':' + contexts[0].rowId]: 'Loaded value'
            };
        });

        const wrapper = mount(DynamicLoadPresentation, {
            props: {
                cache: createDynamicValueCellCache(),
                cacheKey: 'value_external:row-1',
                columnType: 'string',
                displayFormat: undefined,
                loadContext: {
                    rowId: 'row-1',
                    refWebId: 'ref-1',
                    columnKey: 'value_external',
                    columnLabel: 'External'
                },
                loadValues
            }
        });

        expect(wrapper.find('.dynamic-load-skeleton').exists()).toBe(true);

        // Wait 500ms for mount confirmation
        await vi.advanceTimersByTimeAsync(500);
        expect(loadValues).not.toHaveBeenCalled();

        // Wait 1s for batch collection
        await vi.advanceTimersByTimeAsync(1000);
        await wrapper.vm.$nextTick();

        expect(loadValues).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain('Loaded value');
    });

    it('does not load if it unmounts before the 500ms mount confirmation expires', async () => {
        const loadValues = vi.fn(async (contexts: any[]) => {
            return {};
        });

        const wrapper = mount(DynamicLoadPresentation, {
            props: {
                cache: createDynamicValueCellCache(),
                cacheKey: 'value_external:row-1',
                columnType: 'string',
                displayFormat: undefined,
                loadContext: {
                    rowId: 'row-1',
                    refWebId: 'ref-1',
                    columnKey: 'value_external',
                    columnLabel: 'External'
                },
                loadValues
            }
        });

        wrapper.unmount();
        await vi.advanceTimersByTimeAsync(500);
        await vi.advanceTimersByTimeAsync(1000);

        expect(loadValues).not.toHaveBeenCalled();
    });

    it('loads after remount when first mount was canceled before confirmation', async () => {
        const loadValues = vi.fn(async (contexts: any[]) => {
            return {
                [contexts[0].columnKey + ':' + contexts[0].rowId]: 'Loaded on remount'
            };
        });
        const cache = createDynamicValueCellCache();

        const firstWrapper = mount(DynamicLoadPresentation, {
            props: {
                cache,
                cacheKey: 'value_external:row-1',
                columnType: 'string',
                displayFormat: undefined,
                loadContext: {
                    rowId: 'row-1',
                    refWebId: 'ref-1',
                    columnKey: 'value_external',
                    columnLabel: 'External'
                },
                loadValues
            }
        });

        firstWrapper.unmount();
        await vi.advanceTimersByTimeAsync(500);
        await vi.advanceTimersByTimeAsync(1000);

        expect(loadValues).not.toHaveBeenCalled();

        const secondWrapper = mount(DynamicLoadPresentation, {
            props: {
                cache,
                cacheKey: 'value_external:row-1',
                columnType: 'string',
                displayFormat: undefined,
                loadContext: {
                    rowId: 'row-1',
                    refWebId: 'ref-1',
                    columnKey: 'value_external',
                    columnLabel: 'External'
                },
                loadValues
            }
        });

        await vi.advanceTimersByTimeAsync(500);
        await vi.advanceTimersByTimeAsync(1000);
        await secondWrapper.vm.$nextTick();

        expect(loadValues).toHaveBeenCalledTimes(1);
        expect(secondWrapper.text()).toContain('Loaded on remount');
    });

    it('batches multiple mounted cells into one loadValues call', async () => {
        const cache = createDynamicValueCellCache();
        const loadValues = vi.fn(async (contexts: any[]) => {
            const result: Record<string, string> = {};

            for (const context of contexts) {
                result[context.columnKey + ':' + context.rowId] = `Value ${context.refWebId}`;
            }

            return result;
        });

        const firstWrapper = mount(DynamicLoadPresentation, {
            props: {
                cache,
                cacheKey: 'value_external:row-1',
                columnType: 'string',
                displayFormat: undefined,
                loadContext: {
                    rowId: 'row-1',
                    refWebId: 'ref-1',
                    columnKey: 'value_external',
                    columnLabel: 'External'
                },
                loadValues
            }
        });

        const secondWrapper = mount(DynamicLoadPresentation, {
            props: {
                cache,
                cacheKey: 'value_external:row-2',
                columnType: 'string',
                displayFormat: undefined,
                loadContext: {
                    rowId: 'row-2',
                    refWebId: 'ref-2',
                    columnKey: 'value_external',
                    columnLabel: 'External'
                },
                loadValues
            }
        });

        await vi.advanceTimersByTimeAsync(500);
        await vi.advanceTimersByTimeAsync(1000);
        await firstWrapper.vm.$nextTick();
        await secondWrapper.vm.$nextTick();

        expect(loadValues).toHaveBeenCalledTimes(1);
        expect(loadValues).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ refWebId: 'ref-1' }),
                expect.objectContaining({ refWebId: 'ref-2' })
            ])
        );
        expect(firstWrapper.text()).toContain('Value ref-1');
        expect(secondWrapper.text()).toContain('Value ref-2');
    });

    it('reuses the cached value after remounting', async () => {
        const cache = createDynamicValueCellCache();
        const loadValues = vi.fn(async (contexts: any[]) => {
            return {
                [contexts[0].columnKey + ':' + contexts[0].rowId]: 'Loaded value'
            };
        });

        const firstWrapper = mount(DynamicLoadPresentation, {
            props: {
                cache,
                cacheKey: 'value_external:row-1',
                columnType: 'string',
                displayFormat: undefined,
                loadContext: {
                    rowId: 'row-1',
                    refWebId: 'ref-1',
                    columnKey: 'value_external',
                    columnLabel: 'External'
                },
                loadValues
            }
        });

        await vi.advanceTimersByTimeAsync(500); // Mount confirmation
        await vi.advanceTimersByTimeAsync(1000); // Batch collection
        await firstWrapper.vm.$nextTick();
        firstWrapper.unmount();

        const secondWrapper = mount(DynamicLoadPresentation, {
            props: {
                cache,
                cacheKey: 'value_external:row-1',
                columnType: 'string',
                displayFormat: undefined,
                loadContext: {
                    rowId: 'row-1',
                    refWebId: 'ref-1',
                    columnKey: 'value_external',
                    columnLabel: 'External'
                },
                loadValues
            }
        });

        await secondWrapper.vm.$nextTick();

        expect(loadValues).toHaveBeenCalledTimes(1);
        expect(secondWrapper.text()).toContain('Loaded value');
    });
});