<template>
    <div class="flex gap-2 border-b rounded-t items-center">
        <SelectionManagement :has-selected-rows="hasSelectedRows" :allow-select-all="allowSelectAll"
            :can-select-all="canSelectAll" :show-selection-scope-control="showSelectionScopeControl"
            :selection-scope="selectionScope" @select-all="$emit('select-all')" @deselect-all="$emit('deselect-all')"
            @selection-scope-change="handleSelectionScopeUpdate" />
        <div class="ml-auto flex justify-end gap-2">
            <GlobalSearchControl v-if="showGlobalSearchControl" :model-value="globalSearchQuery"
                @update:model-value="handleGlobalSearchQueryUpdate" />
            <slot name="toolbar-actions" :has-rows="hasRows" :has-selected-rows="hasSelectedRows"></slot>
            <v-tooltip v-for="option in activeOptions" :key="option.icon" :text="option.tooltip" location="top">
                <template #activator="{ props }">
                    <v-btn v-bind="props" :disabled="!hasRows" class="transparent-background" :icon="option.icon"
                        variant="text" :color="option.color" @click="option.action" density="comfortable" />
                </template>
            </v-tooltip>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, inject, type PropType } from 'vue';
import GlobalSearchControl from './GlobalSearchControl.vue';
import SelectionManagement from './SelectionManagement.vue';

const selectionScopeOptions = ['all', 'selected', 'unselected'] as const;
type SelectionScope = typeof selectionScopeOptions[number];
const emit = defineEmits<{
    (e: 'select-all'): void;
    (e: 'deselect-all'): void;
    (e: 'download'): void;
    (e: 'show-columns'): void;
    (e: 'show-duration-plot'): void;
    (e: 'selection-scope-change', value: SelectionScope): void;
    (e: 'global-search-query-change', query: string): void;
}>();
const t = inject('t') as (key: string) => string;

const props = defineProps({
    noDuration: {
        type: Boolean,
        default: false
    },
    noDownload: {
        type: Boolean,
        default: false
    },
    noColumns: {
        type: Boolean,
        default: false
    },
    hasRows: {
        type: Boolean,
        default: false
    },
    hasSelectedRows: {
        type: Boolean,
        default: false
    },
    allowSelectAll: {
        type: Boolean,
        default: false
    },
    canSelectAll: {
        type: Boolean,
        default: false
    },
    showSelectionScopeControl: {
        type: Boolean,
        default: false
    },
    selectionScope: {
        type: String as PropType<SelectionScope>,
        default: 'all'
    },
    showGlobalSearchControl: {
        type: Boolean,
        default: false
    },
    globalSearchQuery: {
        type: String,
        default: ''
    }
})

const handleSelectionScopeUpdate = (nextSelectionScope: SelectionScope | null) => {
    if (!nextSelectionScope || !selectionScopeOptions.includes(nextSelectionScope)) {
        return;
    }

    emit('selection-scope-change', nextSelectionScope);
};

const handleGlobalSearchQueryUpdate = (nextQuery: string) => {
    emit('global-search-query-change', nextQuery);
};

const options = computed(() => [
    {
        icon: 'mdi-chart-bell-curve',
        color: 'primary',
        tooltip: t('tooltips.duration-plot'),
        action: () => emit('show-duration-plot')
    },
    {
        icon: 'mdi-file-download-outline',
        color: 'primary',
        tooltip: t('tooltips.download-file'),
        action: () => emit('download')
    },
    {
        icon: 'mdi-view-column',
        color: 'primary',
        tooltip: t('tooltips.column-view'),
        action: () => emit('show-columns')
    }
]);

const activeOptions = computed(() => {
    return options.value.filter(option => {
        if (option.icon === 'mdi-chart-bell-curve' && props.noDuration) return false;
        if (option.icon === 'mdi-file-download-outline' && props.noDownload) return false;
        if (option.icon === 'mdi-view-column' && props.noColumns) return false;
        return true;
    });
});

</script>

<style scoped>
:deep(.v-btn.transparent-background),
:deep(.v-btn.transparent-background:disabled),
:deep(.v-btn.transparent-background[disabled]),
:deep(.v-btn.transparent-background.v-btn--disabled) {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
}

:deep(.v-btn.transparent-background .v-btn__overlay) {
    background: transparent !important;
}
</style>