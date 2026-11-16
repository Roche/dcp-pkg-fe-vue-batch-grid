<template>
    <div class="global-search-control" @keydown.esc="collapseIfEmpty">
        <v-btn v-if="showSearchTrigger" class="transparent-background" variant="text" color="primary"
            density="comfortable" icon="mdi-magnify" @click="expand" />

        <transition name="search-slide" @after-leave="handleAfterLeave">
            <div v-if="isExpanded" class="search-panel">
                <v-text-field ref="searchFieldRef" class="toolbar-global-search" :model-value="modelValue"
                    :placeholder="t('@open-dcp/i18n.grid.searchInTable')" variant="plain" hide-details density="comfortable"
                    single-line @update:model-value="handleQueryUpdate" @blur="collapseIfEmpty" />

                <v-btn class="transparent-background" variant="text" color="primary" density="comfortable"
                    icon="mdi-close" @click="clearAndCollapse" />
            </div>
        </transition>
    </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch, inject } from 'vue';

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    }
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();

const t = inject('t') as (key: string) => string;

const isExpanded = ref(props.modelValue.trim().length > 0);
const showSearchTrigger = ref(!isExpanded.value);
const searchFieldRef = ref<any>(null);

const focusInput = () => {
    const el = searchFieldRef.value?.$el as HTMLElement | undefined;
    const input = el?.querySelector('input') as HTMLInputElement | null;
    input?.focus();
};

const expand = async () => {
    showSearchTrigger.value = false;
    isExpanded.value = true;
    await nextTick();
    focusInput();
};

const collapseIfEmpty = () => {
    if (props.modelValue.trim().length > 0) {
        return;
    }

    isExpanded.value = false;
};

const clearAndCollapse = () => {
    emit('update:modelValue', '');
    isExpanded.value = false;
};

const handleQueryUpdate = (value: string | null) => {
    emit('update:modelValue', value ?? '');
};

const handleAfterLeave = () => {
    if (!isExpanded.value) {
        showSearchTrigger.value = true;
    }
};

watch(
    () => props.modelValue,
    (nextValue) => {
        if (nextValue.trim().length > 0) {
            showSearchTrigger.value = false;
            isExpanded.value = true;
        }
    }
);
</script>

<style scoped>
.global-search-control {
    display: flex;
    align-items: center;
}

.search-panel {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.toolbar-global-search {
    min-width: 220px;
    max-width: 320px;
}

.toolbar-global-search :deep(.v-field) {
    align-items: center;
}

.toolbar-global-search :deep(.v-field__input) {
    min-height: 36px;
    padding-top: 0;
    padding-bottom: 0;
}

.toolbar-global-search :deep(.v-field__prepend-inner) {
    align-items: center;
    padding-top: 0;
}

.search-slide-enter-active,
.search-slide-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.search-slide-enter-from,
.search-slide-leave-to {
    opacity: 0;
    transform: translateX(12px);
}
</style>
