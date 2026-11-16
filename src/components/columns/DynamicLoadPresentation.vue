<template>
    <span v-if="hasResolvedValue" class="dynamic-load-value">{{ formattedValue }}</span>
    <span v-else class="dynamic-load-skeleton" aria-hidden="true"></span>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, type PropType } from 'vue';
import type { DisplayFormat, DynamicValueBatchLoader, DynamicValueLoadContext, ValueColumnDef } from '@/types/BatchGrid';
import { formatDateTime } from '@/utils/columnUtils';
import { getSharedBatchLoader } from '@/utils/dynamicValueCache';
import type { DynamicValueCellCache } from '@/utils/dynamicValueCache';

const props = defineProps({
    cache: {
        type: Object as PropType<DynamicValueCellCache>,
        required: true
    },
    cacheKey: {
        type: String,
        required: true
    },
    columnType: {
        type: String as PropType<ValueColumnDef['type']>,
        required: true
    },
    displayFormat: {
        type: Object as PropType<DisplayFormat>,
        required: false
    },
    loadContext: {
        type: Object as PropType<DynamicValueLoadContext>,
        required: true
    },
    loadValues: {
        type: Function as PropType<DynamicValueBatchLoader>,
        required: true
    }
});

const resolvedValue = ref<string | number | null>(null);
const hasResolvedValue = ref(false);

let isMounted = true;
const batchLoader = getSharedBatchLoader(props.cache, props.loadValues);

const applyLoadedEntry = () => {
    const entry = props.cache.get(props.cacheKey);

    if (entry?.status !== 'loaded') {
        return false;
    }

    resolvedValue.value = (entry.value as string | number | null) ?? null;
    hasResolvedValue.value = true;
    return true;
};

const resolveValue = async (promise: Promise<unknown>) => {
    try {
        const value = await promise;

        if (!isMounted) {
            return;
        }

        resolvedValue.value = (value as string | number | null) ?? null;
    } catch {
        if (!isMounted) {
            return;
        }

        resolvedValue.value = null;
    }

    hasResolvedValue.value = true;
};

const formattedValue = computed(() => {
    if (resolvedValue.value == null || resolvedValue.value === '') {
        return '—';
    }

    if (props.columnType === 'datetime' && typeof resolvedValue.value === 'string') {
        return formatDateTime(resolvedValue.value, props.displayFormat);
    }

    return String(resolvedValue.value);
});

onMounted(() => {
    if (applyLoadedEntry()) {
        return;
    }

    const existingEntry = props.cache.get(props.cacheKey);

    if (existingEntry?.status === 'loading') {
        void resolveValue(existingEntry.promise);
        return;
    }

    // Load via batch loader with mount confirmation
    void resolveValue(
        batchLoader.load(props.cacheKey, props.loadContext, () => isMounted)
    );
});

onUnmounted(() => {
    isMounted = false;
});
</script>

<style scoped>
.dynamic-load-value {
    display: inline-block;
}

.dynamic-load-skeleton {
    display: inline-block;
    width: 5.5rem;
    height: 1rem;
    border-radius: 9999px;
    background: linear-gradient(90deg, rgba(203, 213, 225, 0.45) 25%, rgba(226, 232, 240, 0.85) 50%, rgba(203, 213, 225, 0.45) 75%);
    background-size: 200% 100%;
    animation: dynamic-load-skeleton 1.2s ease-in-out infinite;
    vertical-align: middle;
}

@keyframes dynamic-load-skeleton {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}
</style>
