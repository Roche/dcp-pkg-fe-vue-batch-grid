<template>
    <DcpSideBar :title="t('configure-columns.title')" :model-value="model" @close="model = false" :width="500">
        <div class="configure-columns-content">
            <div v-if="toggleableSections.length === 0" class="configure-columns-empty-state">
                {{ t('configure-columns.empty-state') }}
            </div>

            <div v-else class="configure-columns-list">
                <div v-for="section in toggleableSections" :key="section.title" class="configure-columns-section">
                    <div class="configure-columns-section-title">{{ section.title }}</div>
                    <v-checkbox v-for="column in section.columns" :key="column.key" :label="column.label"
                        :model-value="!hiddenColumnKeySet.has(column.key)" hide-details density="comfortable"
                        color="primary" @update:model-value="onToggleColumn(column.key, $event)" />
                </div>
            </div>
        </div>
    </DcpSideBar>
</template>

<script lang="ts" setup>
import { computed, inject, type PropType } from 'vue';
import { DcpSideBar } from '@open-dcp/vue-basic-components';
import { isValueColumnKey } from '@/utils/columnUtils';
import type { ValueColumnSection } from '@/types/BatchGrid';

const t = inject('t') as (key: string) => string;

const model = defineModel<boolean>();

const props = defineProps({
    valueColumnSections: {
        type: Array as PropType<ValueColumnSection[]>,
        default: () => []
    },
    hiddenColumnKeys: {
        type: Array as PropType<string[]>,
        default: () => []
    }
});

const emit = defineEmits<{
    (event: 'toggle-column-visibility', payload: { key: string; visible: boolean }): void;
}>();

const toggleableSections = computed(() => {
    return props.valueColumnSections
        .map((section) => ({
            title: section.title,
            columns: section.columns.filter((column) => isValueColumnKey(column.key))
        }))
        .filter((section) => section.columns.length > 0);
});
const hiddenColumnKeySet = computed(() => new Set(props.hiddenColumnKeys));

const onToggleColumn = (columnKey: string, checked: unknown) => {
    if (!isValueColumnKey(columnKey)) {
        return;
    }

    emit('toggle-column-visibility', {
        key: columnKey,
        visible: Boolean(checked)
    });
};
</script>

<style scoped>
.configure-columns-content {
    padding: 1rem;
}

.configure-columns-empty-state {
    color: rgba(0, 0, 0, 0.6);
    font-size: 0.95rem;
}

.configure-columns-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.configure-columns-section {
    display: flex;
    flex-direction: column;
}

.configure-columns-section-title {
    color: rgba(0, 0, 0, 0.6);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}
</style>