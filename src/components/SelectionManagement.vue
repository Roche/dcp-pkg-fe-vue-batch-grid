<template>
    <div v-if="hasSelectionActions" class="flex items-center">
        <v-menu v-if="showSelectionScopeControl" location="bottom start">
            <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" class="transparent-background" variant="text" color="primary"
                    density="comfortable">
                    <v-icon>mdi-tune-variant</v-icon>
                </v-btn>
            </template>

            <v-list density="compact" nav>
                <v-list-item v-for="item in selectionScopeItems" :key="item.value" :active="item.value === selectionScope"
                    @click="handleSelectionScopeUpdate(item.value)">
                    <v-list-item-title>{{ item.title }}</v-list-item-title>

                    <template #append>
                        <span class="ml-2 inline-flex w-5 justify-center">
                            <v-icon v-if="item.value === selectionScope" color="primary" size="18">
                                mdi-check
                            </v-icon>
                        </span>
                    </template>
                </v-list-item>
            </v-list>
        </v-menu>

        <v-btn v-if="allowSelectAll && canSelectAll" variant="text" color="primary" density="comfortable"
            @click="$emit('select-all')">
            <v-icon class="mr-2">mdi-checkbox-multiple-marked-outline</v-icon> {{ t('select-all') }}
        </v-btn>

        <v-btn v-if="hasSelectedRows" variant="text" color="primary" density="comfortable"
            @click="$emit('deselect-all')">
            <v-icon class="mr-2">mdi-minus-box-outline</v-icon> {{ t('clear-selection') }}
        </v-btn>
    </div>
</template>

<script lang="ts" setup>
import { computed, inject, type PropType } from 'vue';
const selectionScopeOptions = ['all', 'selected', 'unselected'] as const;
type SelectionScope = typeof selectionScopeOptions[number];
type SelectionScopeItem = { title: string; value: SelectionScope };

const t = inject('t') as (key: string) => string;

const emit = defineEmits<{
    (e: 'select-all'): void;
    (e: 'deselect-all'): void;
    (e: 'selection-scope-change', value: SelectionScope): void;
}>();

const props = defineProps({
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
    }
});

const hasSelectionActions = computed(() => {
    return (props.allowSelectAll && props.canSelectAll) || props.hasSelectedRows || props.showSelectionScopeControl;
});

const handleSelectionScopeUpdate = (nextSelectionScope: SelectionScope | null) => {
    if (!nextSelectionScope || !selectionScopeOptions.includes(nextSelectionScope)) {
        return;
    }

    emit('selection-scope-change', nextSelectionScope);
};

const selectionScopeItems = computed<SelectionScopeItem[]>(() => [
    { title: t('selection-scope.all'), value: 'all' },
    { title: t('selection-scope.selected'), value: 'selected' },
    { title: t('selection-scope.unselected'), value: 'unselected' }
]);
</script>